import { pb } from "../pocketbase";
import { BooksResponse, ChatsResponse, Collections, HighlightsResponse } from "../pocketbase-types";
import { FileUploadObj } from "@/pages/_app/upload.lazy";
import { getUserId } from "../utils/utils";
import { Citation, ExpandHighlights, ExpandMessages, UploadFileRequest } from "../types";
import { Range } from "platejs";

export const downloadBook = async (id: string) => {
    if (!getUserId()) return

    const fileToken = await pb.files.getToken();
    const record = await pb.collection(Collections.Books).getOne(id);
    const filename = record.file;
    return pb.files.getURL(record, filename, { 'download': true, 'token': fileToken });
}

export const uploadBook = async (upload: FileUploadObj) => {
    if (!getUserId()) return

    const data: UploadFileRequest = {
        user: getUserId()!,
        file: new File([upload.file], upload.file.name, { type: upload.file.type }),
    }

    if (upload.cover) {
        data.cover_image = new File([upload.cover], upload.cover.name, { type: upload.cover.type });
    }

    return await pb.collection(Collections.Books).create(data, { requestKey: upload.file.name });
}

export const getBooks = async (page: number, limit: number) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Books).getList(page, limit);
}

export const getBookById = async (id?: string) => {
    if (!getUserId() || !id || id === 'undefined') return null
    return await pb.collection(Collections.Books).getOne<BooksResponse>(id);
}

export const searchBooks = async (query: string) => {
    if (!getUserId()) return
    return await pb.send(`/api/collections/books/records/full-text-search?search=${query}`, { method: 'GET' });
}

export const getLastReadBook = async () => {
    if (!getUserId()) return
    return await pb.collection(Collections.LastRead).getFirstListItem(`user="${getUserId()}"`);
}

export const updateBook = async (id: string, title?: string, coverImage?: File, author?: string) => {
    if (!getUserId()) return

    const data: {
        title?: string,
        cover_image?: File,
        author?: string,
    } = {}

    if (title) data['title'] = title;
    if (coverImage) data['cover_image'] = coverImage;
    if (author) data['author'] = author;

    return await pb.collection(Collections.Books).update(id, data);
}

export const deleteBook = async (id: string) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Books).delete(id);
}

export const getChaptersByBookId = async (id?: string) => {
    if (!getUserId() || !id) return
    return await pb.collection(Collections.Chapters).getFullList({ filter: `book="${id}" && user="${getUserId()}"`, fields: "id,title,order" });
}

export const getChapterById = async (id?: string) => {
    if (!getUserId() || !id) return
    return await pb.collection(Collections.Chapters).getOne(id);
}

export const updateChapter = async (id: string, content?: string) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Chapters).update(id, { content });
}

export const getChats = async (id?: string) => {
    if (!getUserId() || !id) return
    return await pb.collection(Collections.Chats).getFullList({ filter: `book="${id}" && user="${getUserId()}"`, sort: '-updated' });
}

export const addChat = async (id: string) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Chats).create({ title: "New Chat", book: id, user: getUserId() });
}

export const updateChat = async (id: string, title?: string) => {
    if (!getUserId()) return

    const chat: { title?: string, archived?: boolean } = {}
    if (title) chat['title'] = title;

    return await pb.collection(Collections.Chats).update(id, chat);
}

export const deleteChat = async (id: string) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Chats).delete(id);
}

export const getMessagesByChatId = async (id?: string) => {
    if (!getUserId() || !id) return
    return await pb.collection(Collections.Chats).getOne<ChatsResponse<ExpandMessages>>(id, { expand: "messages" });
}

export const addMessage = async (id: string, content: string, role: "user" | "assistant", citations: Citation[] | null) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Messages).create({ chat: id, content, role, user: getUserId(), citations });
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

export const getHighlights = async (bookId?: string, chapterId?: string) => {
    if (!getUserId()) return;

    let filter = `book="${bookId}" && user="${getUserId()}"`;
    if (chapterId) filter += ` && chapter="${chapterId}"`;

    return await pb.collection(Collections.Highlights).getFullList<HighlightsResponse<ExpandHighlights>>({
        filter,
        expand: "book,chapter"
    });
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

export const deleteHighlight = async (id: string) => {
    if (!getUserId()) return
    return await pb.collection(Collections.Highlights).delete(id);
}

export const deleteHighlightByHash = async (hash: string) => {
    if (!getUserId()) return
    const highlight = await pb.collection(Collections.Highlights).getFirstListItem(`hash="${hash}"`);
    return await pb.collection(Collections.Highlights).delete(highlight.id);
}

export const uploadLimitReached = async () => {
    await pb.collection("users").authRefresh()

    const user = pb.authStore.record
    const paid = user?.paid
    if (!user || paid) return false

    const uploadCountRecord = await pb.collection(Collections.UploadCount).getOne(user.id)
    return uploadCountRecord.uploadCount >= 5
}

export const isPaidUser = async () => {
    await pb.collection("users").authRefresh()
    return pb.authStore.record?.paid === true
}

export const deleteAccount = async () => {
    const userId = getUserId();
    if (!userId) return;

    return await pb.collection(Collections.Users).update(userId, { 'deleted': true });
}

export const createCheckoutSession = async (subscriptionType: "monthly" | "yearly") => {
    if (!getUserId()) return

    return await pb.send('/stripe/create-checkout-session', {
        method: 'GET',
        query: { subscriptionType }
    });

}

export const createPortalSession = async () => {
    if (!getUserId()) return

    return await pb.send('/stripe/create-portal-session', {
        method: 'GET'
    });
}