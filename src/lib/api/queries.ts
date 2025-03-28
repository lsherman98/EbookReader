import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getChats, getFileById, getFiles, getMessagesByChatId } from "./api";

export function useGetFiles(page: number = 1, limit: number = 25) {
    return useQuery({
        queryKey: ['files', { page, limit }],
        queryFn: () => getFiles(page, limit),
        placeholderData: keepPreviousData
    });
}

export function useGetFileById(id: string) {
    return useQuery({
        queryKey: ['file', id],
        queryFn: () => getFileById(id),
        placeholderData: keepPreviousData
    });
}

export function useGetMessagesByChatId(chatId?: string) {
    return useQuery({
        queryKey: ['messages', chatId],
        queryFn: () => getMessagesByChatId(chatId),
        placeholderData: keepPreviousData,
    });
}

export function useGetChats(fileId: string) {
    return useQuery({
        queryKey: ['chats'],
        queryFn: () => getChats(fileId),
        placeholderData: keepPreviousData
    });
}