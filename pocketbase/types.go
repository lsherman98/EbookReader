package main

type ChatRequest struct {
	Messages []ChatMessage `json:"messages"`
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
