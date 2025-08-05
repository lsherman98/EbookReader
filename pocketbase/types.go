package main

type ChatRequest struct {
	BookID    string `json:"bookId,omitempty"`
	ChapterID string `json:"chapterId,omitempty"`
	ChatID    string `json:"chatId,omitempty"`
}

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type ChatResponse struct {
	Content   string     `json:"content"`
	Role      string     `json:"role"`
	Citations []Citation `json:"citations"`
	MessageId string     `json:"messageId"`
	Created   string     `json:"created"`
}

type Citation struct {
	Text    string `json:"text"`
	Index   string `json:"index"`
	Chapter string `json:"chapter"`
}

type StructuredChatResponse struct {
	Answer    string     `json:"answer"`
	Citations []Citation `json:"citations"`
}
