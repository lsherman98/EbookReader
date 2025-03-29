import { Message } from "@/components/ui/chat-message";
import { pb } from "../pocketbase";
import { ChatsResponse, Collections, MessagesResponse } from "../pocketbase-types";
import { FileUploadObj } from "@/pages/_app/upload.lazy";

export const getFiles = async (page: number, limit: number) => {
    const user = pb.authStore.record;
    if (!user?.id) {
        throw new Error('User is not logged in');
    }
    return await pb.collection('files').getList(page, limit);
}

export const getFileById = async (id: string) => {
    const user = pb.authStore.record;
    if (!user?.id) {
        throw new Error('User is not logged in');
    }
    const fileToken = await pb.files.getToken();
    const record = await pb.collection('files').getOne(id);
    const filename = record.file;
    return pb.files.getURL(record, filename, { 'download': false, 'token': fileToken });
}

export const downloadFile = async (id: string) => {
    const fileToken = await pb.files.getToken();
    const record = await pb.collection('files').getOne(id);
    const filename = record.file;
    return pb.files.getURL(record, filename, { 'download': true, 'token': fileToken });
}

export const uploadFile = async (upload: FileUploadObj) => {
    const user = pb.authStore.record;
    if (!user?.id) {
        throw new Error('User is not logged in');
    }

    const data: UploadFileRequest = {
        title: upload.title || upload.file.name,
        type: upload.file.type,
        user: user.id,
        file: new File([upload.file], upload.file.name, { type: upload.file.type }),
    }

    if (upload.cover) {
        data.cover_image = new File([upload.cover], upload.cover.name, { type: upload.cover.type });
    }

    if (upload.author) {
        data.author = upload.author;
    }

    return await pb.collection('files').create(data, { requestKey: upload.file.name });
}

export const updateFile = async (id: string, title?: string, coverImage?: File, author?: string) => {
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

    return await pb.collection('files').update(id, data);
}

export const deleteFile = async (id: string) => {
    return await pb.collection('files').delete(id);
}

export const getMessagesByChatId = async (chatId?: string) => {
    if (!chatId) {
        // handle error
        return [];
    }
    return await pb.collection(Collections.Chats).getOne<ChatsResponse<ExpandMessages>>(chatId, { expand: "messages" });
}

export const addMessage = async (chat: string, content: string, role: "user" | "assistant") => {
    const user = pb.authStore.record;
    if (!user?.id) {
        throw new Error('User is not logged in');
    }

    return await pb.collection('messages').create({ chat, content, role, user: user.id });
}

export const getChats = async (file: string) => {
    const chatCount = (await pb.collection(Collections.Chats).getList(1, 1)).totalItems;
    if (chatCount === 0) {
        const user = pb.authStore.record;
        if (!user?.id) {
            throw new Error('User is not logged in');
        }
        await pb.collection(Collections.Chats).create({ title: "New Chat", file, user: user.id });
    }

    return await pb.collection(Collections.Chats).getFullList({ sort: '-updated' });
}

export const addChat = async (file: string) => {
    const user = pb.authStore.record;
    if (!user?.id) {
        throw new Error('User is not logged in');
    }

    return await pb.collection('chats').create({ title: "New Chat", file, user: user.id });
}

export const updateChat = async (id: string, title?: string, archive?: boolean) => {
    const chat: { title?: string, archived?: boolean } = {}
    if (title) {
        chat['title'] = title;
    }
    if (archive !== undefined) {
        chat['archived'] = archive;
    }

    return await pb.collection('chats').update(id, chat);

}

export const deleteChat = async (id: string) => {
    return await pb.collection('chats').delete(id);
}

export const generateAiResponse = async (messages: Message[]) => {
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
    title: string;
    type: string;
    user: string;
    file: File;
    cover_image?: File;
    author?: string;
}