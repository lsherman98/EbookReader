export interface Citation {
    text: string;
    index: string;
    chapter: string;
    id?: string;
}

export interface StructuredChatResponse {
    role: "assistant";
    content: string;
    citations: Citation[];
}