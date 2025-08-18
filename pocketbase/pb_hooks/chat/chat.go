package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/vector_search"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

func trackChatAIUsage(app *pocketbase.PocketBase, bookId string, completion *llms.ContentResponse) {
	if len(completion.Choices) == 0 || completion.Choices[0].GenerationInfo == nil {
		return
	}

	genInfo := completion.Choices[0].GenerationInfo
	promptTokens, ok1 := genInfo["PromptTokens"].(int)
	completionTokens, ok2 := genInfo["CompletionTokens"].(int)

	if !ok1 || !ok2 {
		app.Logger().Error("Error extracting token counts from completion response")
		return
	}

	inputCost := float64(promptTokens) * 2.50 / 1000000
	outputCost := float64(completionTokens) * 10.0 / 1000000
	totalCost := inputCost + outputCost

	AIUsageCollection, err := app.FindCollectionByNameOrId("ai_usage")
	if err != nil {
		app.Logger().Error("Error finding ai_usage collection:", "error", err.Error())
		return
	}

	bookRecord, err := app.FindRecordById("books", bookId)
	if err != nil {
		app.Logger().Error("Error finding book record:", "error", err.Error())
		return
	}
	user := bookRecord.GetString("user")

	var model string = os.Getenv("OPENAI_MODEL")

	existingRecord, err := app.FindFirstRecordByFilter("ai_usage",
		"book = {:book} && user = {:user} && task = 'chat'",
		dbx.Params{
			"book": bookId,
			"user": user,
		})

	if err == nil && existingRecord != nil {
		currentInputTokens := existingRecord.GetInt("input_tokens")
		currentOutputTokens := existingRecord.GetInt("output_tokens")
		currentInputCost := existingRecord.GetFloat("input_cost")
		currentOutputCost := existingRecord.GetFloat("output_cost")
		currentTotalCost := existingRecord.GetFloat("total_cost")

		existingRecord.Set("input_tokens", currentInputTokens+promptTokens)
		existingRecord.Set("output_tokens", currentOutputTokens+completionTokens)
		existingRecord.Set("input_cost", currentInputCost+inputCost)
		existingRecord.Set("output_cost", currentOutputCost+outputCost)
		existingRecord.Set("total_cost", currentTotalCost+totalCost)

		if err := app.Save(existingRecord); err != nil {
			app.Logger().Error("Error updating AI usage record:", "error", err.Error())
		}
	} else {
		AIUsageRecord := core.NewRecord(AIUsageCollection)
		AIUsageRecord.Set("task", "chat")
		AIUsageRecord.Set("provider", "openai")
		AIUsageRecord.Set("model", model)
		AIUsageRecord.Set("input_tokens", promptTokens)
		AIUsageRecord.Set("output_tokens", completionTokens)
		AIUsageRecord.Set("input_cost", inputCost)
		AIUsageRecord.Set("output_cost", outputCost)
		AIUsageRecord.Set("total_cost", totalCost)
		AIUsageRecord.Set("book", bookId)
		AIUsageRecord.Set("user", user)

		if err := app.Save(AIUsageRecord); err != nil {
			app.Logger().Error("Error saving AI usage record:", "error", err.Error())
		}
	}
}

func Init(app *pocketbase.PocketBase) error {
	var model string = os.Getenv("OPENAI_MODEL")
	OpenAI4oStructured, err := openai.New(openai.WithModel(model), openai.WithResponseFormat(GetJSONSchema()))
	if err != nil {
		return err
	}

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		msgsCollection, err := app.FindCollectionByNameOrId("messages")
		if err != nil {
			return err
		}

		se.Router.POST("/chat", func(e *core.RequestEvent) error {
			var data ChatRequest
			if err := e.BindBody(&data); err != nil {
				return e.BadRequestError("failed to read chat request data", err)
			}

			bookRecord, err := e.App.FindRecordById("books", data.BookID)
			if err != nil {
				return e.InternalServerError("failed to get book information", err)
			}

			msgs, err := e.App.FindRecordsByFilter("messages", "chat = {:chatId}", "created", 0, 0, dbx.Params{"chatId": data.ChatID})
			if err != nil {
				return e.InternalServerError("failed to get messages for chat", err)
			}

			if len(msgs) == 0 {
				return e.BadRequestError("no messages found for the specified chat", nil)
			}

			latestMsg := msgs[len(msgs)-1]

			searchResults, err := vector_search.Search(app, "", latestMsg.GetString("content"), data.BookID, data.ChapterID, 7)
			if err != nil {
				return e.InternalServerError("failed to search vectors", err)
			}

			prompt := buildPromptWithContext(searchResults, bookRecord.GetString("title"), bookRecord.GetString("author"))
			content := make([]llms.MessageContent, 0, len(msgs)+1)
			content = append(content, llms.TextParts(llms.ChatMessageTypeSystem, prompt))

			for _, msg := range msgs {
				messageType := llms.ChatMessageTypeAI
				if msg.GetString("role") == "user" {
					messageType = llms.ChatMessageTypeHuman
				}
				content = append(content, llms.TextParts(messageType, msg.GetString("content")))
			}

			completion, err := OpenAI4oStructured.GenerateContent(context.Background(), content, llms.WithStreamingFunc(func(streamCtx context.Context, chunk []byte) error {
				return nil
			}), llms.WithJSONMode())
			if err != nil {
				return e.InternalServerError("failed to generate llm response", err)
			}

			trackChatAIUsage(app, data.BookID, completion)

			var structuredResponse StructuredChatResponse
			if err := json.Unmarshal([]byte(completion.Choices[0].Content), &structuredResponse); err != nil {
				return e.InternalServerError("failed to parse structured response", err)
			}

			newMessage := buildMessage(msgsCollection, data.ChatID, "assistant", structuredResponse.Answer, e.Auth.Id, structuredResponse.Citations)

			err = e.App.Save(newMessage)
			if err != nil {
				return e.InternalServerError("failed to save new message", err)
			}

			e.JSON(http.StatusOK, ChatResponse{
				Content:   structuredResponse.Answer,
				Citations: structuredResponse.Citations,
				MessageId: newMessage.Id,
				Created:   newMessage.GetDateTime("created").String(),
			})

			return nil
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	return nil
}

func buildPromptWithContext(searchResults []map[string]interface{}, bookTitle, bookAuthor string) string {
	var contextBuilder strings.Builder

	contextBuilder.WriteString(fmt.Sprintf("You are an AI assistant helping users understand their book content.\n\nBOOK INFORMATION:\nTitle: %s\nAuthor: %s\n\n", bookTitle, bookAuthor))

	if len(searchResults) == 0 {
		contextBuilder.WriteString("Use your knowledge of this book to answer the user's question.")
		return contextBuilder.String()
	}

	contextBuilder.WriteString("Use the following context to answer the user's question.\n\nIMPORTANT INSTRUCTIONS:\n- Quote extensively and directly from the provided context when answering\n- The user cannot see this context, so you must include relevant quotes in your response\n- When quoting or referencing information, ALWAYS cite it using the index number in square brackets\n- Format citations like this: \"This is a direct quote from the text.\"[75]\n- CRITICAL: Every individual quote, phrase, or piece of information from the context must have its own citation immediately after it, even if multiple quotes come from the same index\n- Example: \"The monster was gigantic in stature\"[69], \"yet uncouth and distorted in its proportions\"[69]. \"His face was of such loathsome yet appalling hideousness\"[69] that it caused fear.\n- Prefer longer, more complete quotes over brief paraphrases\n- MANDATORY: For EVERY quote you use from the context, you MUST include that exact quoted text in the citations array\n- Each citation in the citations array must include the exact text that was quoted, the index number, and the chapter ID\n- Do not add bracket citations [XX] to your answer unless you are actually quoting or referencing specific content from the context\n- Every piece of quoted text must appear in both your answer (with bracket citation) AND in the citations array\n- If you paraphrase instead of quote, do not use bracket citations\n- If the context doesn't contain enough information to fully answer the question, say so clearly\n- Focus on direct quotes with proper citations rather than paraphrasing without citations\n\nCONTEXT:\n\n")

	for _, result := range searchResults {
		if content, ok := result["content"].(string); ok {
			chapterID := result["chapter"]
			index := result["index"]
			contextBuilder.WriteString(fmt.Sprintf("[Index: %v] (Chapter: %v) %s\n\n", index, chapterID, content))
		}
	}

	return contextBuilder.String()
}

func buildMessage(msgsCollection *core.Collection, chatID, role, content, userID string, citations interface{}) *core.Record {
	newMessage := core.NewRecord(msgsCollection)
	newMessage.Set("chat", chatID)
	newMessage.Set("role", role)
	newMessage.Set("content", content)
	newMessage.Set("citations", citations)
	newMessage.Set("user", userID)
	return newMessage
}
