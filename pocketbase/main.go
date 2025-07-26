package main

import (
	"context"
	"database/sql"
	"errors"
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

	llm, err := openai.New()
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
				log.Println("Failed to perform vector search:", err)
			}

			var contextBuilder strings.Builder
			if len(searchResults) > 0 {
				contextBuilder.WriteString("Use the following context to answer the user's question. Please include relevant quotes from the context in your response. The user cannot see this context, so quote directly from it when relevant:\n")
				for _, result := range searchResults {
					if content, ok := result["content"].(string); ok {
						contextBuilder.WriteString("- ")
						contextBuilder.WriteString(content)
						contextBuilder.WriteString("\n")
					}
				}
			}

			content := make([]llms.MessageContent, 0, len(data.Messages)+1)
			if contextBuilder.Len() > 0 {
				content = append(content, llms.TextParts(llms.ChatMessageTypeSystem, contextBuilder.String()))
			}

			log.Println(content)

			for _, msg := range data.Messages {
				messageType := llms.ChatMessageTypeAI
				if msg.Role == "user" {
					messageType = llms.ChatMessageTypeHuman
				}
				content = append(content, llms.TextParts(messageType, msg.Content))
			}

			completion, err := llm.GenerateContent(ctx, content, llms.WithStreamingFunc(func(streamCtx context.Context, chunk []byte) error {
				return nil
			}), llms.WithJSONMode())
			if err != nil {
				return e.InternalServerError("Failed to generate completion", err)
			}

			e.JSON(http.StatusOK, ChatResponse{
				Content: completion.Choices[0].Content,
				Role:    "assistant",
				Parts:   []any{},
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

		// Parse HTML into individual nodes
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
						log.Println("Failed to save vector:", err)
					}
				}

				if end < len(htmlNodes) {
					log.Println("Waiting for 1 minute before processing next batch of vectors...")
					time.Sleep(1 * time.Minute)
				}
			}
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
		return nil, err
	}

	ignoredTags := map[string]bool{
		"head": true,
		"meta": true,
		"link": true,
		"td":   true,
		"tr":   true,
	}

	var nodes []string
	var traverse func(*html.Node)
	traverse = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// Skip ignored tags
			if !ignoredTags[n.Data] {
				var buf strings.Builder
				html.Render(&buf, n)
				nodeHTML := buf.String()
				if strings.TrimSpace(nodeHTML) != "" {
					nodes = append(nodes, nodeHTML)
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}
	}
	traverse(doc)
	return nodes, nil
}
