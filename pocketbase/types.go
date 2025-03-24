package main

type ChatRequest struct {
	ID       string        `json:"id"`
	Messages []ChatMessage `json:"messages"`
	Model   string        `json:"model"`
}

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type ChatResponse struct {
	Content             string `json:"content"`
	Role			 string `json:"role"`
	Model			   string `json:"model"`
	Parts []any `json:"parts"`
}
