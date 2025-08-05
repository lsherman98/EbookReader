import { ChaptersResponse, MessagesResponse } from "./pocketbase-types";

export interface Citation {
    text: string;
    index: string;
    chapter: string;
    id?: string;
}

export interface AIChatResponse {
    content: string;
    citations: Citation[];
    created: string;
    id: string;
}

export type ExpandMessages = {
    messages: MessagesResponse[]
}

export type ExpandChapters = {
    chapters: ChaptersResponse[]
}

export type UploadFileRequest = {
    user: string;
    file: File;
    cover_image?: File;
}