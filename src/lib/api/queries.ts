import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBookById, getBooks, getChapterById, getChaptersByBookId, getChats, getHighlights, getLastReadBook, getMessagesByChatId, searchBooks, uploadLimitReached } from "./api";

export function useGetBooks(page: number = 1, limit: number = 25) {
    return useQuery({
        queryKey: ['books'],
        queryFn: () => getBooks(page, limit),
        placeholderData: keepPreviousData
    });
}

export function useGetBookById(id?: string) {
    return useQuery({
        queryKey: ['book', id],
        queryFn: () => getBookById(id),
        placeholderData: keepPreviousData,
        enabled: !!id && id !== 'undefined',
    });
}

export function useSearchBooks(query: string) {
    return useQuery({
        queryKey: ['search', query],
        queryFn: () => searchBooks(query),
        enabled: !!query,
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

export function useGetChaptersByBookId(id?: string) {
    return useQuery({
        queryKey: ['chapters', id],
        queryFn: () => getChaptersByBookId(id),
        placeholderData: keepPreviousData,
        enabled: !!id && id !== 'undefined',
    });
}

export function useGetChapterById(id?: string) {
    return useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapterById(id),
        placeholderData: keepPreviousData,
        enabled: !!id,
    });
}

export function useGetChats(id?: string) {
    return useQuery({
        queryKey: ['chats', id],
        queryFn: () => getChats(id),
        placeholderData: keepPreviousData,
        enabled: !!id && id !== 'undefined',
    });
}

export function useGetMessagesByChatId(id?: string) {
    return useQuery({
        queryKey: ['messages', id],
        queryFn: () => getMessagesByChatId(id),
        placeholderData: keepPreviousData,
        enabled: !!id,
    });
}

export function useGetHighlights(bookId?: string, chapterId?: string) {
    return useQuery({
        queryKey: ['highlights', bookId, chapterId],
        queryFn: () => getHighlights(bookId, chapterId),
        enabled: !!bookId && bookId !== 'undefined',
    });
}

export function useGetUploadLimitReached() {
    return useQuery({
        queryKey: [],
        queryFn: () => uploadLimitReached(),
        enabled: true,
        placeholderData: false,
        refetchOnMount: 'always',
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: 'always',
    });
}
