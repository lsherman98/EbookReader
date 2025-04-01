package main

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
	"github.com/pocketbase/pocketbase/tools/routine"
	"github.com/timsims/pamphlet"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

func main() {
	app := pocketbase.New()
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
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
		bookRecord := e.Record
		userID := bookRecord.GetString("user")
		bookID := bookRecord.Id

		// Initialize collections
		chatsCollection, err := app.FindCollectionByNameOrId("chats")
		if err != nil {
			return err
		}

		chaptersCollection, err := app.FindCollectionByNameOrId("chapters")
		if err != nil {
			return err
		}

		// Create Chat Record
		chatRecord := core.NewRecord(chatsCollection)
		chatRecord.Set("user", userID)
		chatRecord.Set("book", bookID)
		chatRecord.Set("title", "New Chat")

		if err := app.Save(chatRecord); err != nil {
			return err
		}

		// Read Book File
		fileKey := bookRecord.BaseFilesPath() + "/" + bookRecord.GetString("file")

		fsys, err := app.NewFilesystem()
		if err != nil {
			return err
		}
		defer fsys.Close()

		r, err := fsys.GetFile(fileKey)
		if err != nil {
			return err
		}
		defer r.Close()

		data, err := io.ReadAll(r)
		if err != nil {
			return err
		}

		// Parse Book
		parser, err := pamphlet.OpenBytes(data)
		if err != nil {
			log.Fatal(err)
		}
		defer parser.Close()

		parsedBook := parser.GetBook()

		// Update Book Record
		bookRecord.Set("title", parsedBook.Title)
		bookRecord.Set("author", parsedBook.Author)

		// Create Chapter Records - Asynchronously
		var chapterRecordsIds []string

		routine.FireAndForget(func() {
			var records []*core.Record
			for i, chapter := range parsedBook.Chapters {
				chapterRecord := core.NewRecord(chaptersCollection)
				chapterRecord.Set("book", bookID)
				chapterRecord.Set("title", chapter.Title)
				chapterRecord.Set("order", chapter.Order)

				content, err := chapter.GetContent()
				if err != nil {
					log.Printf("Failed to get content for chapter %d: %v\n", i+1, err)
					continue // Skip to the next chapter if content retrieval fails
				}

				htmlContent := "<!DOCTYPE html>" + content
				filename := chapter.Title + ".html"
				f, err := filesystem.NewFileFromBytes([]byte(htmlContent), filename)
				if err != nil {
					log.Printf("Failed to create file for chapter %d: %v\n", i+1, err)
					continue // Skip to the next chapter if file creation fails
				}

				chapterRecord.Set("chapter", f)
				records = append(records, chapterRecord)
			}

			// Save all chapter records in a single transaction
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

			// Update Book Record with Chapter IDs
			bookRecord.Set("chapters+", chapterRecordsIds)
			bookRecord.Set("available", true)

			if err := app.Save(bookRecord); err != nil {
				log.Println("Failed to update book record:", err)
			}
		})

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
