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
			data := struct {
				Messages []struct {
					Attachments []struct{} `json:"attachments"`
					Content     []struct {
						Text string `json:"text"`
						Type string `json:"type"`
					} `json:"content"`
					CreatedAt string `json:"createdAt"`
					ID        string `json:"id"`
					Metadata  struct {
						Custom struct{} `json:"custom"`
					} `json:"metadata"`
					Role string `json:"role"`
				} `json:"messages"`
			}{}
			if err := e.BindBody(&data); err != nil {
				return e.BadRequestError("Failed to read request data", err)
			}
			app.Logger().Info("Messages: ", data.Messages)

			ctx := context.Background()

			content := []llms.MessageContent{}

			for _, msg := range data.Messages {
				if msg.Role == "user" {
					content = append(content, llms.TextParts(llms.ChatMessageTypeHuman, msg.Content[0].Text))
				} else {
					content = append(content, llms.TextParts(llms.ChatMessageTypeAI, msg.Content[0].Text))
				}
			}

			completion, err := llm.GenerateContent(ctx, content, llms.WithStreamingFunc(func(ctx context.Context, chunk []byte) error {
				return nil
			}))
			if err != nil {
				return e.InternalServerError("Failed to generate completion", err)
			}

			e.JSON(http.StatusOK, map[string]any{
				"text":              completion.Choices[0].Content,
				"completion_tokens": completion.Choices[0].GenerationInfo["CompletionTokens"],
				"prompt_tokens":     completion.Choices[0].GenerationInfo["PromptTokens"],
				"reasoning_tokens":  completion.Choices[0].GenerationInfo["ReasoningTokens"],
				"total_tokens":      completion.Choices[0].GenerationInfo["TotalTokens"],
				"reasoning_content": completion.Choices[0].ReasoningContent,
			})
			return nil
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
