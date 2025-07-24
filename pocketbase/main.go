package main

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/vector_search"
	"github.com/mattn/go-sqlite3"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/routine"
	"github.com/timsims/pamphlet"
	"github.com/tmc/langchaingo/documentloaders"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
	"github.com/tmc/langchaingo/textsplitter"
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

			content := make([]llms.MessageContent, len(data.Messages))
			for i, msg := range data.Messages {
				messageType := llms.ChatMessageTypeAI
				if msg.Role == "user" {
					messageType = llms.ChatMessageTypeHuman
				}
				content[i] = llms.TextParts(messageType, msg.Content)
			}

			completion, err := llm.GenerateContent(ctx, content, llms.WithStreamingFunc(func(ctx context.Context, chunk []byte) error {
				return nil
			}))
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
		log.Println("Processing new book record...")
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

		p := documentloaders.NewText(strings.NewReader(content))
		split := textsplitter.NewRecursiveCharacter()
		split.ChunkSize = 500
		split.ChunkOverlap = 50
		docs, err := p.LoadAndSplit(context.Background(), split)
		if err != nil {
			return err
		}

		for _, doc := range docs {
			startIndex := strings.Index(content, doc.PageContent)
			endIndex := -1
			if startIndex != -1 {
				endIndex = startIndex + len(doc.PageContent)
			}

			vector := core.NewRecord(vectorCollection)
			vector.Set("title", e.Record.GetString("title"))
			vector.Set("content", doc.PageContent)
			vector.Set("chapter", chapterId)
			vector.Set("book", bookId)
			vector.Set("start_index", startIndex)
			vector.Set("end_index", endIndex)
			if err := app.Save(vector); err != nil {
				return err
			}
		}

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
