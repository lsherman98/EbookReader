import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBookById, getBooks, getChapterById, getChaptersByBookId, getChats, getHighlights, getLastReadBook, getMessagesByChatId, searchBooks } from "./api";

export function useGetBooks(page: number = 1, limit: number = 25) {
    return useQuery({
        queryKey: ['books'],
        queryFn: () => getBooks(page, limit),
        placeholderData: keepPreviousData
    });
}

export function useGetBookById(bookId?: string) {
    return useQuery({
        queryKey: ['books', bookId],
        queryFn: () => getBookById(bookId),
        placeholderData: keepPreviousData,
        enabled: !!bookId && bookId !== 'undefined',
    });
}

export function useGetChaptersByBookId(bookId?: string) {
    return useQuery({
        queryKey: ['books', bookId],
        queryFn: () => getChaptersByBookId(bookId),
        placeholderData: keepPreviousData,
        enabled: !!bookId && bookId !== 'undefined',
    });
}

export function useGetChapterById(chapterId?: string) {
    return useQuery({
        queryKey: ['chapters', chapterId],
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
        queryKey: ['chats', bookId],
        queryFn: () => getChats(bookId),
        placeholderData: keepPreviousData,
        enabled: !!bookId && bookId !== 'undefined',
    });
}

export function useGetLastReadBook() {
    return useQuery({
        queryKey: ['lastReadBook'],
        queryFn: () => getLastReadBook(),
        gcTime: Infinity,
        enabled: false
    });
}

export function useGetHighlights(bookId?: string, chapterId?: string) {
    return useQuery({
        queryKey: ['highlights', bookId, chapterId],
        queryFn: () => getHighlights(bookId, chapterId),
        enabled: !!bookId && bookId !== 'undefined',
    });
}

export function useSearchBooks(query: string) {
    return useQuery({
        queryKey: ['search', query],
        queryFn: () => searchBooks(query),
        enabled: !!query,
    });
}
