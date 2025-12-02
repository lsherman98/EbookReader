import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { pb } from "../pocketbase";
import { toast } from "@/hooks/use-toast";
import { Citation } from "../types";
import { Message } from "@/components/ui/chat-message";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleError(error: Error) {
  console.error(error)
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
  })
}

export function getUserId(msg: string = 'User is not logged in'): string | null {
  const user = pb.authStore.record;
  if (!user?.id) {
    handleError(new Error(msg));
    return null;
  }
  return user.id;
}

export const createMessageObj = (data: {
  content: string;
  role: "user" | "assistant";
  id: string;
  created: string;
  citations?: Citation[] | null;
}): Message => {
  return {
    content: data.content,
    role: data.role,
    id: data.id,
    createdAt: new Date(data.created),
    citations: data.citations || null,
  };
};

export const scrollElementIntoView = (elementId: string): void => {
  const element = document.querySelector(`[data-block-id="${elementId}"]`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

export const calculateTextSimilarity = (snippet: string, text: string): number => {
  const normalizedSnippet = normalizeText(snippet);
  const normalizedText = normalizeText(text);

  if (normalizedSnippet === normalizedText) return 1.0;
  if (normalizedText.includes(normalizedSnippet)) return 1.0;

  if (normalizedText.includes(normalizedSnippet) || normalizedSnippet.includes(normalizedText)) {
    const shorter = normalizedSnippet.length < normalizedText.length ? normalizedSnippet : normalizedText;
    const longer = normalizedSnippet.length >= normalizedText.length ? normalizedSnippet : normalizedText;
    return shorter.length / longer.length;
  }

  const words1 = normalizedSnippet.split(" ").filter((w) => w.length > 2);
  const words2 = normalizedText.split(" ").filter((w) => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const matchingWords = words1.filter((word) => words2.includes(word));
  const wordSimilarity = matchingWords.length / Math.max(words1.length, words2.length);

  return wordSimilarity > 0.3 ? wordSimilarity * 0.8 : wordSimilarity * 0.4;
};

export function generateTextHash(text: string): string {
  if (!text) return '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

export const normalizeText = (text: string, forCitation: boolean = false): string => {
  if (!text) return '';
  let normalized = text.toLowerCase().replace(/\s+/g, " ").replace(/["'“”‘’]/g, "");

  if (forCitation) {
    normalized = normalized.replace(/[^\w\s]/g, "");
  } else {
    normalized = normalized.replace(/[;,]/g, ".")
  }

  return normalized.trim()
};

export const getPageNumbers = (totalPages: number, currentPage: number) => {
  const pageNumbers = [];
  const maxPagesToShow = 5;

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    pageNumbers.push(1);

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      startPage = 2;
      endPage = Math.min(4, totalPages - 1);
    }

    if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
      endPage = totalPages - 1;
    }

    if (startPage > 2) {
      pageNumbers.push("...");
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (endPage < totalPages - 1) {
      pageNumbers.push("...");
    }

    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
  }

  return pageNumbers;
};