package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/vector_search"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

func Init(app *pocketbase.PocketBase) error {
	OpenAI4oStructured, err := openai.New(openai.WithModel("gpt-4o"), openai.WithResponseFormat(GetJSONSchema()))
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

			prompt := buildPromptWithContext(searchResults)
			content := make([]llms.MessageContent, 0, len(msgs)+1)
			content = append(content, llms.TextParts(llms.ChatMessageTypeSystem, prompt))

			for _, msg := range msgs {
				messageType := llms.ChatMessageTypeAI
				if msg.GetString("role") == "user" {
					messageType = llms.ChatMessageTypeHuman
				}
				content = append(content, llms.TextParts(messageType, msg.GetString("content")))
			}
			e.App.Logger().Info("Chat content", "content", fmt.Sprintf("%+v", content))

			completion, err := OpenAI4oStructured.GenerateContent(context.Background(), content, llms.WithStreamingFunc(func(streamCtx context.Context, chunk []byte) error {
				return nil
			}), llms.WithJSONMode())
			if err != nil {
				return e.InternalServerError("failed to generate llm response", err)
			}

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

func buildPromptWithContext(searchResults []map[string]interface{}) string {
	if len(searchResults) == 0 {
		return ""
	}

	var contextBuilder strings.Builder
	contextBuilder.WriteString("You are an AI assistant helping users understand their book content. Use the following context to answer the user's question.\n\nIMPORTANT INSTRUCTIONS:\n- Quote extensively and directly from the provided context when answering\n- The user cannot see this context, so you must include relevant quotes in your response\n- When quoting or referencing information, ALWAYS cite it using the index number in square brackets\n- Format citations like this: \"This is a direct quote from the text.\"[75]\n- CRITICAL: Every individual quote, phrase, or piece of information from the context must have its own citation immediately after it, even if multiple quotes come from the same index\n- Example: \"The monster was gigantic in stature\"[69], \"yet uncouth and distorted in its proportions\"[69]. \"His face was of such loathsome yet appalling hideousness\"[69] that it caused fear.\n- Prefer longer, more complete quotes over brief paraphrases\n- MANDATORY: For EVERY quote you use from the context, you MUST include that exact quoted text in the citations array\n- Each citation in the citations array must include the exact text that was quoted, the index number, and the chapter ID\n- Do not add bracket citations [XX] to your answer unless you are actually quoting or referencing specific content from the context\n- Every piece of quoted text must appear in both your answer (with bracket citation) AND in the citations array\n- If you paraphrase instead of quote, do not use bracket citations\n- If the context doesn't contain enough information to fully answer the question, say so clearly\n- Focus on direct quotes with proper citations rather than paraphrasing without citations\n\nCONTEXT:\n\n")

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
