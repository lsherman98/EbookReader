package main

type ChatRequest struct {
	ID       string        `json:"id"`
	Messages []ChatMessage `json:"messages"`
}

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type ChatResponse struct {
	Content             string `json:"content"`
	Role			 string `json:"role"`
	Parts []any `json:"parts"`
}
