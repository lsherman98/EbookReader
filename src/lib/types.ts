import { BooksResponse, ChaptersResponse, MessagesResponse } from "./pocketbase-types";

export interface Citation {
    quote: string;
    index: string;
    chapter: string;
    id?: string;
}

export interface AIChatResponse {
    content: string;
    citations: Citation[];
    created: string;
    messageId: string;
}

export type ExpandMessages = {
    messages: MessagesResponse[]
}

export type ExpandChapters = {
    chapters: ChaptersResponse[]
}

export type ExpandHighlights = {
    book: BooksResponse
    chapter: ChaptersResponse
}

export type UploadFileRequest = {
    user: string;
    file: File;
    cover_image?: File;
}