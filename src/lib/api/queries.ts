import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBookById, getBooks, getChapterById, getChats, getHighlights, getLastReadBook, getMessagesByChatId } from "./api";

export function useGetBooks(page: number = 1, limit: number = 25) {
    return useQuery({
        queryKey: ['books'],
        queryFn: () => getBooks(page, limit),
        placeholderData: keepPreviousData
    });
}

export function useGetBookById(bookId: string) {
    return useQuery({
        queryKey: ['book', bookId],
        queryFn: () => getBookById(bookId),
        placeholderData: keepPreviousData
    });
}

export function useGetChapterById(chapterId?: string) {
    return useQuery({
        queryKey: ['chapter', chapterId],
        queryFn: () => getChapterById(chapterId),
        placeholderData: keepPreviousData,
        enabled: !!chapterId,
    });
}

export function useGetMessagesByChatId(chatId?: string) {
    return useQuery({
        queryKey: ['messages', chatId],
        queryFn: () => getMessagesByChatId(chatId),
        placeholderData: keepPreviousData,
        enabled: !!chatId,
    });
}

export function useGetChats(bookId?: string) {
    return useQuery({
        queryKey: ['chats'],
        queryFn: () => getChats(bookId),
        placeholderData: keepPreviousData,
        enabled: !!bookId,
    });
}

export function useGetLastReadBook() {
    return useQuery({
        queryKey: ['lastReadBook'],
        queryFn: () => getLastReadBook(),
        placeholderData: keepPreviousData,
    });
}

export function useGetHighlights(bookId?: string, chapterId?: string) {
    return useQuery({
        queryKey: ['highlights', { bookId, chapterId }],
        queryFn: () => getHighlights(bookId, chapterId),
        placeholderData: keepPreviousData,
        enabled: !!bookId,
    });
}
