import { Message } from "@/components/ui/chat-message";
import { pb } from "../pocketbase";
import { ChatsResponse, Collections, MessagesResponse } from "../pocketbase-types";
import { FileUploadObj } from "@/pages/_app/upload.lazy";
import { getUserId, handleError } from "../utils";

export const getBooks = async (page: number, limit: number) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Books).getList(page, limit);
}

export const getBookById = async (bookId: string) => {
    if (!getUserId()) return

    const fileToken = await pb.files.getToken();
    const record = await pb.collection(Collections.Books).getOne(bookId);
    const filename = record.file;
    return pb.files.getURL(record, filename, { 'download': false, 'token': fileToken });
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

export const getMessagesByChatId = async (chatId?: string) => {
    if (!getUserId() || !chatId) return
    
    return await pb.collection(Collections.Chats).getOne<ChatsResponse<ExpandMessages>>(chatId, { expand: "messages" });
}

export const addMessage = async (chatId: string, content: string, role: "user" | "assistant") => {
    const userId = getUserId();
    if (!userId) {
        return
    }

    return await pb.collection(Collections.Messages).create({ chatId, content, role, user: userId });
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

export const generateAiResponse = async (messages: Message[]) => {
    if (!getUserId()) return
    return await pb.send('/chat', {
        method: 'POST',
        body: {
            messages,
        }
    });
}

type ExpandMessages = {
    messages: MessagesResponse[]
}

type UploadFileRequest = {
    user: string;
    file: File;
    cover_image?: File;
}