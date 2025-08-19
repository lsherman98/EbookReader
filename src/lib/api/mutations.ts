import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addChat, addHighlight, addMessage, deleteAccount, deleteBook, deleteChat, deleteHighlight, deleteHighlightByHash, downloadBook, generateAIResponse, updateBook, updateChapter, updateChat, uploadBook } from "./api";
import { handleError } from "../utils/utils";
import { FileUploadObj } from "@/pages/_app/upload.lazy";
import { Citation } from "../types";
import { Range } from "platejs";
import { pb } from "../pocketbase";

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
        mutationFn: (bookId: string, title?: string, coverImage?: File, author?: string) => updateBook(bookId, title, coverImage, author),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['books'] });
        }
    })
}

export function useDeleteBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (bookId: string) => deleteBook(bookId),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['books'] });
        }
    })
}

export function useDownloadBook() {
    return useMutation({
        mutationFn: (bookId: string) => downloadBook(bookId),
        onError: handleError,
        onSuccess(data) {
            const link = document.createElement('a');
            if (data) {
                link.href = data;
                link.download = 'download';
                document.body.appendChild(link);
            }
            link.click();
            document.body.removeChild(link);
        },
    })
}

export function useUpdateChapter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chapterId, content }: { chapterId: string, content?: string }) => updateChapter(chapterId, content),
        onError: handleError,
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({ queryKey: ['chapter', data?.id] });
        }
    })
}

export function useAddChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (bookId: string) => addChat(bookId),
        onError: handleError,
        onSuccess: async (_, bookId) => {
            await queryClient.invalidateQueries({ queryKey: ['chats', bookId] });
        }
    })
}

export function useUpdateChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chatId, title }: { chatId: string, title?: string }) => updateChat(chatId, title),
        onError: handleError,
        onSuccess: async (_, { chatId }) => {
            await queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
        }
    })
}

export function useDeleteChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chatId }: { chatId: string }) => deleteChat(chatId),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    })
}

export function useAddMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chatId, content, role, citations = null }: { chatId: string; content: string; role: "user" | "assistant", citations?: Citation[] | null }) => addMessage(chatId, content, role, citations),
        onError: handleError,
        onSuccess: async (_, { chatId }) => {
            await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
    })
}

export function useGenerateAIResponse() {
    return useMutation({
        mutationFn: ({ bookId, chatId, chapterId }: { bookId: string, chatId: string, chapterId?: string }) => generateAIResponse(bookId, chatId, chapterId),
        onError: handleError,
    })
}

export function useAddHighlight() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ bookId, chapterId, text, selection, hash }: { bookId: string, chapterId: string, text: string, selection: Range, hash: string }) => addHighlight(bookId, chapterId, text, selection, hash),
        onError: handleError,
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({ queryKey: ['highlights', data?.book] });
        }
    })
}

export function useDeleteHighlight() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteHighlight(id),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['highlights'] });
            await queryClient.invalidateQueries({ queryKey: ['chapters'] });
        }
    })
}

export function useDeleteHighlightByHash() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (hash: string) => deleteHighlightByHash(hash),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['highlights'] });
            await queryClient.invalidateQueries({ queryKey: ['chapters'] });
        }
    })
}

export function useDeleteAccount() {
    return useMutation({
        mutationFn: () => deleteAccount(),
        onError: handleError,
        onSuccess: () => {
            pb.authStore.clear();
            location.reload();
        }
    })
}