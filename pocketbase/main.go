package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/vector_search"
	"github.com/mattn/go-sqlite3"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/routine"
	"github.com/timsims/pamphlet"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
	"golang.org/x/net/html"
)

// register a new driver with default PRAGMAs and the same query
// builder implementation as the already existing sqlite3 builder
func init() {
	// initialize default PRAGMAs for each new connection
	sql.Register("pb_sqlite3",
		&sqlite3.SQLiteDriver{
			ConnectHook: func(conn *sqlite3.SQLiteConn) error {
				_, err := conn.Exec(`
                    PRAGMA busy_timeout       = 10000;
                    PRAGMA journal_mode       = WAL;
                    PRAGMA journal_size_limit = 200000000;
                    PRAGMA synchronous        = NORMAL;
                    PRAGMA foreign_keys       = ON;
                    PRAGMA temp_store         = MEMORY;
                    PRAGMA cache_size         = -16000;
                `, nil)

				return err
			},
		},
	)

	dbx.BuilderFuncMap["pb_sqlite3"] = dbx.BuilderFuncMap["sqlite3"]
}

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DBConnect: func(dbPath string) (*dbx.DB, error) {
			return dbx.Open("pb_sqlite3", dbPath)
		},
	})

	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	err := vector_search.Init(app, vector_search.VectorCollection{
		Name: "vectors",
	})
	if err != nil {
		log.Fatal(err)
	}

	// Create structured response format
	responseFormat := &openai.ResponseFormat{
		Type: "json_schema",
		JSONSchema: &openai.ResponseFormatJSONSchema{
			Name: "structured_chat_response",
			Schema: &openai.ResponseFormatJSONSchemaProperty{
				Type: "object",
				Properties: map[string]*openai.ResponseFormatJSONSchemaProperty{
					"answer": {
						Type:        "string",
						Description: "The complete answer to the user's question",
					},
					"citations": {
						Type:        "array",
						Description: "Array of citations with text snippets and their indices",
						Items: &openai.ResponseFormatJSONSchemaProperty{
							Type: "object",
							Properties: map[string]*openai.ResponseFormatJSONSchemaProperty{
								"text_snippet": {
									Type:        "string",
									Description: "The specific text snippet used in the response, not the entire context quote",
								},
								"index": {
									Type:        "string",
									Description: "The index of the HTML node in the document",
								},
								"chapter": {
									Type:        "string",
									Description: "The chapter ID that this citation belongs to",
								},
							},
							Required: []string{"text_snippet", "index", "chapter"},
						},
					},
				},
				AdditionalProperties: false,
				Required:             []string{"answer", "citations"},
			},
			Strict: true,
		},
	}

	OpenAI4oStructured, err := openai.New(openai.WithModel("gpt-4o"), openai.WithResponseFormat(responseFormat))
	if err != nil {
		log.Fatal(err)
	}

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), false))
		return se.Next()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.POST("/chat", func(e *core.RequestEvent) error {
			ctx := context.Background()
			var data ChatRequest

			if err := e.BindBody(&data); err != nil {
				return e.BadRequestError("Failed to read request data", err)
			}

			lastMessage := data.Messages[len(data.Messages)-1]

			searchResults, err := vector_search.Search(app, "", lastMessage.Content, data.BookID, data.ChapterID, 5)
			if err != nil {
				return e.InternalServerError("Failed to search vectors", err)
			}
			var contextBuilder strings.Builder
			if len(searchResults) > 0 {
				contextBuilder.WriteString("You are an AI assistant helping users understand their book content. Use the following context to answer the user's question.\n\nIMPORTANT INSTRUCTIONS:\n- Quote extensively and directly from the provided context when answering\n- The user cannot see this context, so you must include relevant quotes in your response\n- When quoting or referencing information, ALWAYS cite it using the index number in square brackets\n- Format citations like this: \"This is a direct quote from the text.\"[75]\n- CRITICAL: Every individual quote, phrase, or piece of information from the context must have its own citation immediately after it, even if multiple quotes come from the same index\n- Example: \"The monster was gigantic in stature\"[69], \"yet uncouth and distorted in its proportions\"[69]. \"His face was of such loathsome yet appalling hideousness\"[69] that it caused fear.\n- Prefer longer, more complete quotes over brief paraphrases\n- MANDATORY: For EVERY quote you use from the context, you MUST include that exact quoted text in the citations array\n- Each citation in the citations array must include the exact text_snippet that was quoted, the index number, and the chapter ID\n- Do not add bracket citations [XX] to your answer unless you are actually quoting or referencing specific content from the context\n- Every piece of quoted text must appear in both your answer (with bracket citation) AND in the citations array\n- If you paraphrase instead of quote, do not use bracket citations\n- If the context doesn't contain enough information to fully answer the question, say so clearly\n- Focus on direct quotes with proper citations rather than paraphrasing without citations\n\nCONTEXT:\n\n")
				for i, result := range searchResults {
					if content, ok := result["content"].(string); ok {
						var chapterInfo string
						if chapterID, hasChapter := result["chapter"]; hasChapter {
							chapterInfo = fmt.Sprintf(" (Chapter: %v)", chapterID)
						}

						if index, hasIndex := result["index"]; hasIndex {
							contextBuilder.WriteString(fmt.Sprintf("[Index: %v%s] %s\n\n", index, chapterInfo, content))
						} else {
							contextBuilder.WriteString(fmt.Sprintf("[Index: %d%s] %s\n\n", i, chapterInfo, content))
						}
					}
				}
			}

			content := make([]llms.MessageContent, 0, len(data.Messages)+1)
			if contextBuilder.Len() > 0 {
				content = append(content, llms.TextParts(llms.ChatMessageTypeSystem, contextBuilder.String()))
			}

			for _, msg := range data.Messages {
				messageType := llms.ChatMessageTypeAI
				if msg.Role == "user" {
					messageType = llms.ChatMessageTypeHuman
				}
				content = append(content, llms.TextParts(messageType, msg.Content))
			}

			completion, err := OpenAI4oStructured.GenerateContent(ctx, content, llms.WithStreamingFunc(func(streamCtx context.Context, chunk []byte) error {
				return nil
			}), llms.WithJSONMode())

			if err != nil {
				return e.InternalServerError("Failed to generate completion", err)
			}

			var structuredResponse StructuredChatResponse
			if err := json.Unmarshal([]byte(completion.Choices[0].Content), &structuredResponse); err != nil {
				return e.InternalServerError("Failed to parse structured response", err)
			}

			// Validate that all bracket citations in the answer have corresponding entries in citations array
			citationRegex := regexp.MustCompile(`\[(\d+)\]`)
			citationsInText := citationRegex.FindAllStringSubmatch(structuredResponse.Answer, -1)

			// Create a map of citation indices from the citations array
			citationMap := make(map[string]bool)
			for _, citation := range structuredResponse.Citations {
				citationMap[citation.Index] = true
			}

			// Check if all bracket citations have corresponding entries
			var missingCitations []string
			for _, match := range citationsInText {
				if len(match) > 1 {
					index := match[1]
					if !citationMap[index] {
						missingCitations = append(missingCitations, index)
					}
				}
			}

			if len(missingCitations) > 0 {
				return e.InternalServerError(fmt.Sprintf("Response contains bracket citations %v that are missing from citations array. Every bracket citation must have a corresponding entry in the citations array with the quoted text.", missingCitations), nil)
			}

			e.JSON(http.StatusOK, ChatResponse{
				Content: structuredResponse.Answer,
				Role:    "assistant",
				Parts:   structuredResponse.Citations,
			})

			return nil
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	app.OnRecordAfterCreateSuccess("messages").BindFunc(func(e *core.RecordEvent) error {
		record, err := e.App.FindRecordById("chats", e.Record.GetString("chat"))
		if err != nil {
			return errors.New("failed to find chat record")
		}

		record.Set("messages+", e.Record.Id)

		err = e.App.Save(record)
		if err != nil {
			return err
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("books").BindFunc(func(e *core.RecordEvent) error {
		bookRecord := e.Record
		userID := bookRecord.GetString("user")
		bookID := bookRecord.Id

		lastRecord, _ := app.FindFirstRecordByData("last_read", "user", userID)
		if lastRecord == nil {
			lastReadCollection, err := app.FindCollectionByNameOrId("last_read")
			if err != nil {
				return err
			}
			lastRecord = core.NewRecord(lastReadCollection)
			lastRecord.Set("user", userID)
			lastRecord.Set("book", bookID)
			if err := app.Save(lastRecord); err != nil {
				return err
			}
		}

		chatsCollection, err := app.FindCollectionByNameOrId("chats")
		if err != nil {
			return err
		}

		chaptersCollection, err := app.FindCollectionByNameOrId("chapters")
		if err != nil {
			return err
		}

		chatRecord := core.NewRecord(chatsCollection)
		chatRecord.Set("user", userID)
		chatRecord.Set("book", bookID)
		chatRecord.Set("title", "New Chat")

		if err := app.Save(chatRecord); err != nil {
			return err
		}

		fileKey := bookRecord.BaseFilesPath() + "/" + bookRecord.GetString("file")

		fsys, err := app.NewFilesystem()
		if err != nil {
			return err
		}
		defer fsys.Close()

		r, err := fsys.GetReader(fileKey)
		if err != nil {
			return err
		}
		defer r.Close()

		data, err := io.ReadAll(r)
		if err != nil {
			return err
		}

		parser, err := pamphlet.OpenBytes(data)
		if err != nil {
			log.Fatal(err)
		}
		defer parser.Close()

		parsedBook := parser.GetBook()

		bookRecord.Set("title", parsedBook.Title)
		bookRecord.Set("author", parsedBook.Author)
		bookRecord.Set("description", parsedBook.Description)
		bookRecord.Set("language", parsedBook.Language)
		bookRecord.Set("date", parsedBook.Date)
		bookRecord.Set("subject", parsedBook.Subject)

		var chapterRecordsIds []string

		re := regexp.MustCompile(`(?s)^.*@page\s*\{[^}]*\}\s*`)

		routine.FireAndForget(func() {
			var records []*core.Record
			for i, chapter := range parsedBook.Chapters {
				if chapter.Title == "" {
					continue
				}

				chapterRecord := core.NewRecord(chaptersCollection)
				chapterRecord.Set("book", bookID)
				chapterRecord.Set("title", chapter.Title)
				chapterRecord.Set("order", chapter.Order)
				chapterRecord.Set("href", chapter.Href)
				chapterRecord.Set("has_toc", chapter.HasToc)

				content, err := chapter.GetContent()
				if err != nil {
					log.Printf("Failed to get content for chapter %d: %v\n", i+1, err)
					continue
				}

				content = re.ReplaceAllString(content, "")

				htmlContent := "<!DOCTYPE html>" + content
				chapterRecord.Set("content", htmlContent)
				records = append(records, chapterRecord)
			}

			err := app.RunInTransaction(func(txApp core.App) error {
				for _, record := range records {
					if err := txApp.Save(record); err != nil {
						return err
					}
					chapterRecordsIds = append(chapterRecordsIds, record.Id)
				}
				return nil
			})

			if err != nil {
				log.Println("Failed to save chapter records:", err)
				return
			}

			bookRecord.Set("chapters+", chapterRecordsIds)
			bookRecord.Set("available", true)
			bookRecord.Set("current_chapter", chapterRecordsIds[0])

			if err := app.Save(bookRecord); err != nil {
				log.Println("Failed to update book record:", err)
			}
		})

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("chapters").BindFunc(func(e *core.RecordEvent) error {
		vectorCollection, err := app.FindCollectionByNameOrId("vectors")
		if err != nil {
			return err
		}
		content := e.Record.GetString("content")
		chapterId := e.Record.Id
		bookId := e.Record.GetString("book")

		htmlNodes, err := parseHTMLIntoNodes(content)
		if err != nil {
			return err
		}

		routine.FireAndForget(func() {
			batchSize := 1000

			for i := 0; i < len(htmlNodes); i += batchSize {
				end := min(i+batchSize, len(htmlNodes))
				batch := htmlNodes[i:end]

				for j, nodeHTML := range batch {
					index := i + j

					vector := core.NewRecord(vectorCollection)
					vector.Set("title", e.Record.GetString("title"))
					vector.Set("content", nodeHTML)
					vector.Set("chapter", chapterId)
					vector.Set("book", bookId)
					vector.Set("index", index)
					if err := app.Save(vector); err != nil {
						log.Printf("Failed to save vector at index %d: %v", index, err)
					} else {
						log.Printf("Successfully saved vector at index %d", index)
					}
				}

				if end < len(htmlNodes) {
					log.Printf("Completed batch, waiting 1 minute before next batch. Progress: %d/%d", end, len(htmlNodes))
					time.Sleep(1 * time.Minute)
				}
			}
			log.Printf("Completed all vector processing for chapter %s", chapterId)
		})

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func parseHTMLIntoNodes(htmlContent string) ([]string, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		log.Printf("Failed to parse HTML: %v", err)
		return nil, err
	}

	ignoredTags := map[string]bool{
		"head":  true,
		"meta":  true,
		"link":  true,
		"td":    true,
		"tr":    true,
		"a":     true,
		"title": true,
		"html":  true,
		"body":  true,
		"i":     true,
	}

	var nodes []string
	nodeCount := 0

	var traverse func(*html.Node, int)
	traverse = func(n *html.Node, depth int) {
		if n.Type == html.ElementNode {
			if ignoredTags[n.Data] {
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					traverse(c, depth+1)
				}
				return
			}

			hasElementChildren := false
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				if c.Type == html.ElementNode && !ignoredTags[c.Data] {
					hasElementChildren = true
					break
				}
			}

			if !hasElementChildren {
				var buf strings.Builder
				html.Render(&buf, n)
				nodeHTML := buf.String()
				trimmed := strings.TrimSpace(nodeHTML)

				if trimmed != "" {
					nodes = append(nodes, nodeHTML)
					nodeCount++
				}
			} else {
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					traverse(c, depth+1)
				}
			}
		} else if n.Type == html.TextNode {
			text := strings.TrimSpace(n.Data)
			if text != "" && len(text) > 10 {
				nodes = append(nodes, text)
				nodeCount++
			}
		} else {
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				traverse(c, depth+1)
			}
		}
	}

	traverse(doc, 0)

	return nodes, nil
}
