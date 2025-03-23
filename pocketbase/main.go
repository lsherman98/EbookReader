package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
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
			// app.Logger().Info(fmt.Sprintf("%+v", data))

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
			// e.Stream(http.StatusOK, "application/json", strings.NewReader(completion.Choices[0].Content))
			e.JSON(http.StatusOK, ChatResponse{
				Content: completion.Choices[0].Content,
				Role:    "assistant",
				Parts:   []any{},
			})
			return nil
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
