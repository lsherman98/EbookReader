package ai_chat

import "github.com/tmc/langchaingo/llms/openai"

func GetJSONSchema() *openai.ResponseFormat {
	return &openai.ResponseFormat{
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
						Description: "Array of citations with the exact quote used and their indices and chapter Ids",
						Items: &openai.ResponseFormatJSONSchemaProperty{
							Type: "object",
							Properties: map[string]*openai.ResponseFormatJSONSchemaProperty{
								"quote": {
									Type:        "string",
									Description: "The specific quote used in the response, not the entire context quote",
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
							Required: []string{"quote", "index", "chapter"},
						},
					},
				},
				AdditionalProperties: false,
				Required:             []string{"answer", "citations"},
			},
			Strict: true,
		},
	}

}
