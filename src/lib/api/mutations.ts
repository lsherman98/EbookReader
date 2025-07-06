import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addChat, addMessage, deleteBook, deleteChat, downloadBook, generateAiResponse, setLastReadBook, setLastReadChapter, updateBook, updateChat, uploadBook } from "./api";
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

export function useAddMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chatId, content, role }: { chatId: string; content: string; role: "user" | "assistant" }) => addMessage(chatId, content, role),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
    })
}

export function useAddChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (bookId: string) => addChat(bookId),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    })
}

export function useUpdateChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chatId, title }: { chatId: string, title?: string }) => updateChat(chatId, title),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
    })
}

export function useDeleteChat() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chatId, bookId }: { chatId: string, bookId: string }) => deleteChat(chatId, bookId),
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

export function useSetLastReadBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (bookId: string) => setLastReadBook(bookId),
        onError: handleError,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['lastReadBook'] });
        }
    });
}

export function useSetLastReadChapter() {
    return useMutation({
        mutationFn: ({ bookId, chapterId }: { bookId: string, chapterId: string }) => setLastReadChapter(bookId, chapterId),
        onError: handleError,
    });
}