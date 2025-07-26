package main

type ChatRequest struct {
	Messages  []ChatMessage `json:"messages"`
	BookID    string        `json:"bookId,omitempty"`
	ChapterID string        `json:"chapterId,omitempty"`
	ChatID    string        `json:"chatId,omitempty"`
}

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type ChatResponse struct {
	Content string `json:"content"`
	Role    string `json:"role"`
	Model   string `json:"model"`
	Parts   []any  `json:"parts"`
}
