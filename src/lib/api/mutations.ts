import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addChat, addMessage, deleteChat, deleteFile, downloadFile, generateAiResponse, updateChat, updateFile, uploadFile } from "./api";
import { handleError } from "../utils";
import { Message } from "@/components/ui/chat-message";
import { FileUploadObj } from "@/pages/_app/upload.lazy";

export function useUploadFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: FileUploadObj) => uploadFile(file),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['files'] });
        },
    })
}

export function useUpdateFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string, title?: string, coverImage?: File, author?: string) => updateFile(id, title, coverImage, author),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['files'] });
        }
    })
}

export function useDeleteFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteFile(id),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['files'] });
        }
    })
}

export function useDownloadFile() {
    return useMutation({
        mutationFn: (id: string) => downloadFile(id),
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