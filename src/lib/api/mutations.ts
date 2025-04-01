import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addChat, addMessage, deleteBook, deleteChat, downloadBook, generateAiResponse, updateBook, updateChat, uploadBook } from "./api";
import { handleError } from "../utils";
import { Message } from "@/components/ui/chat-message";
import { FileUploadObj } from "@/pages/_app/upload.lazy";

export function useUploadBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: FileUploadObj) => uploadBook(file),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['books'] });
        },
    })
}

export function useUpdateBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string, title?: string, coverImage?: File, author?: string) => updateBook(id, title, coverImage, author),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['books'] });
        }
    })
}

export function useDeleteBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteBook(id),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['book'] });
        }
    })
}

export function useDownloadBook() {
    return useMutation({
        mutationFn: (id: string) => downloadBook(id),
        onError: handleError,
    })
}

export function useAddMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chat, content, role }: { chat: string; content: string; role: "user" | "assistant" }) => addMessage(chat, content, role),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
    })
}

export function useAddChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (fileId: string) => addChat(fileId),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    })
}

export function useUpdateChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, title }: { id: string, title?: string }) => updateChat(id, title),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    })
}

export function useDeleteChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteChat(id),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    })
}

export function useGenerateAIResponse() {
    return useMutation({
        mutationFn: (messages: Message[]) => generateAiResponse(messages),
        onError: handleError,
    })
}