package ai_chat

type ChatRequest struct {
	BookId    string `json:"bookId,omitempty"`
	ChapterId string `json:"chapterId,omitempty"`
	ChatId    string `json:"chatId,omitempty"`
}

type Citation struct {
	Quote   string `json:"quote"`
	Index   string `json:"index"`
	Chapter string `json:"chapter"`
}

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type ChatResponse struct {
	Content   string     `json:"content"`
	Citations []Citation `json:"citations"`
	MessageId string     `json:"messageId"`
	Created   string     `json:"created"`
}

type StructuredChatResponse struct {
	Answer    string     `json:"answer"`
	Citations []Citation `json:"citations"`
}
