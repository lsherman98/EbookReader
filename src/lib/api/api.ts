import { pb } from "../pocketbase";
import { BooksResponse, ChatsResponse, Collections, HighlightsResponse } from "../pocketbase-types";
import { FileUploadObj } from "@/pages/_app/upload.lazy";
import { getUserId, handleError } from "../utils";
import { Citation, ExpandChapters, ExpandHighlights, ExpandMessages, UploadFileRequest } from "../types";
import { Range } from "platejs";

export const getBooks = async (page: number, limit: number) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Books).getList(page, limit);
}

export const getBookById = async (bookId: string) => {
    if (!getUserId()) return

    return await pb.collection(Collections.Books).getOne<BooksResponse<ExpandChapters>>(bookId, {
        expand: "chapters",
    });
}

export const downloadBook = async (bookId: string) => {
    if (!getUserId()) return

    const fileToken = await pb.files.getToken();
    const record = await pb.collection(Collections.Books).getOne(bookId);
    const filename = record.file;
    return pb.files.getURL(record, filename, { 'download': true, 'token': fileToken });
}

export const uploadBook = async (upload: FileUploadObj) => {
    const userId = getUserId();
    if (!userId) {
        return
    }

    const data: UploadFileRequest = {
        user: userId,
        file: new File([upload.file], upload.file.name, { type: upload.file.type }),
    }

    if (upload.cover) {
        data.cover_image = new File([upload.cover], upload.cover.name, { type: upload.cover.type });
    }
    return await pb.collection(Collections.Books).create(data, { requestKey: upload.file.name });
}

export const updateBook = async (bookId: string, title?: string, coverImage?: File, author?: string) => {
    const userId = getUserId();
    if (!userId) {
        return
    }

    const data: {
        title?: string,
        cover_image?: File,
        author?: string,
    } = {}

    if (title) {
        data['title'] = title;
    }
    if (coverImage) {
        data['cover_image'] = coverImage;
    }
    if (author) {
        data['author'] = author;
    }

    return await pb.collection(Collections.Books).update(bookId, data);
}

export const deleteBook = async (bookId: string) => {
    if (!getUserId()) return

    return await pb.collection(Collections.Books).delete(bookId);
}

export const getChapterById = async (chapterId?: string) => {
    if (!getUserId() || !chapterId) return
    return await pb.collection(Collections.Chapters).getOne(chapterId);
}

export const updateChapter = async (chapterId: string, content?: string) => {
    if (!getUserId()) return

    return await pb.collection(Collections.Chapters).update(chapterId, { content });
}

export const getMessagesByChatId = async (chatId?: string) => {
    if (!getUserId() || !chatId) return

    return await pb.collection(Collections.Chats).getOne<ChatsResponse<ExpandMessages>>(chatId, { expand: "messages" });
}

export const addMessage = async (chatId: string, content: string, role: "user" | "assistant", citations: Citation[] | null) => {
    const userId = getUserId();
    if (!userId) {
        return
    }

    return await pb.collection(Collections.Messages).create({ chat: chatId, content, role, user: userId, citations });
}

export const getChats = async (bookId?: string) => {
    const userId = getUserId();
    if (!userId || !bookId) {
        return
    }

    return await pb.collection(Collections.Chats).getFullList({ filter: `book="${bookId}" && user="${userId}"`, sort: '-updated' });
}

export const addChat = async (bookId: string) => {
    const userId = getUserId();
    if (!userId) {
        return
    }

    return await pb.collection(Collections.Chats).create({ title: "New Chat", book: bookId, user: userId });
}

export const updateChat = async (chatId: string, title?: string) => {
    if (!getUserId()) return

    const chat: { title?: string, archived?: boolean } = {}
    if (title) {
        chat['title'] = title;
    }

    return await pb.collection(Collections.Chats).update(chatId, chat);
}

export const deleteChat = async (chatId: string, bookId: string) => {
    const userId = getUserId();
    if (!userId) {
        return
    }

    const chatCount = (await pb.collection(Collections.Chats).getList(1, 1, {
        filter: `book="${bookId}" && user="${userId}"`,
    })).totalItems;

    if (chatCount === 1) {
        handleError(new Error("You cannot delete the last chat"));
        return
    }

    return await pb.collection(Collections.Chats).delete(chatId);
}

export const generateAIResponse = async (
    bookId: string,
    chatId: string,
    chapterId?: string
) => {
    if (!getUserId()) return
    return await pb.send('/chat', {
        method: 'POST',
        body: {
            bookId,
            chatId,
            chapterId,
        }
    });
}

export const getLastReadBook = async () => {
    if (!getUserId()) return
    return await pb.collection(Collections.LastRead).getFirstListItem(`user="${getUserId()}"`);
}

export const getHighlights = async (bookId?: string, chapterId?: string) => {
    if (!getUserId()) return

    const filter = `book="${bookId}" && user="${getUserId()}"`;
    if (chapterId) {
        return await pb.collection(Collections.Highlights).getFullList<HighlightsResponse<ExpandHighlights>>({ filter: `${filter} && chapter="${chapterId}"`, expand: "book,chapter" });
    }
    return await pb.collection(Collections.Highlights).getFullList<HighlightsResponse<ExpandHighlights>>({ filter, expand: "book,chapter" });
}

export const addHighlight = async (bookId: string, chapterId: string, text: string, selection: Range, hash: string) => {
    if (!getUserId()) return

    return await pb.collection(Collections.Highlights).create({
        book: bookId,
        chapter: chapterId,
        text,
        selection: JSON.stringify(selection),
        user: getUserId(),
        hash,
    });
}

export const deleteHighlight = async (highlightId?: string, hash?: string) => {
    if (!getUserId()) return

    if (!highlightId && !hash) {
        throw new Error("Either highlightId or hash must be provided");
    }

    if (highlightId) {
        return await pb.collection(Collections.Highlights).delete(highlightId);
    }

    const highlight = await pb.collection(Collections.Highlights).getFirstListItem(`hash="${hash}"`);
    if (!highlight) return
    return await pb.collection(Collections.Highlights).delete(highlight.id);

}