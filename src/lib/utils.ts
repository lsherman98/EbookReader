import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { pb } from "./pocketbase";
import { toast } from "@/hooks/use-toast";
import { Citation } from "./types";
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

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getUserId(msg: string = 'User is not logged in'): string | null {
  const user = pb.authStore.record;
  if (!user?.id) {
    handleError(new Error(msg));
    return null;
  }
  return user.id;
}

export const normalizeText = (text: string, forCitation: boolean = false): string => {
  if (!text) return '';
  let normalized = text.toLowerCase().replace(/\s+/g, " ")

  if (forCitation) {
    normalized = normalized.replace(/[^\w\s]/g, "");
  } else {
    normalized = normalized.replace(/;/g, ".")
  }

  return normalized.trim()
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

export function findBestCitation(quote: string, citations: Citation[]): Citation | null {
  const normalizedQuote = normalizeText(quote, true);
  let bestMatch: Citation | null = null;
  let bestScore = 0;

  citations.forEach((citation) => {
    const normalizedSnippet = normalizeText(citation.quote, true);

    let score = 0;
    if (normalizedSnippet === normalizedQuote) {
      score = 100;
    } else if (normalizedSnippet.includes(normalizedQuote) || normalizedQuote.includes(normalizedSnippet)) {
      score = 80;
    } else {
      const quoteWords = normalizedQuote.split(" ");
      const snippetWords = normalizedSnippet.split(" ");
      const intersection = quoteWords.filter((word) => snippetWords.includes(word));
      score = (intersection.length / Math.max(quoteWords.length, snippetWords.length)) * 60;
    }

    if (score > bestScore && score > 40) {
      bestScore = score;
      bestMatch = citation;
    }
  });

  return bestMatch;
}

export function processCitationsForDisplay(content: string, citations: Citation[]): string {
  let processedContent = content;
  const usedCitations = new Set<string>();

  processedContent = processedContent.replace(/"([^"]+)"(\s*\[(\d+)\])?/g, (_, quote, __, citationIndex) => {
    const citation = findBestCitation(quote, citations);

    if (citation) {
      const textHash = generateTextHash(citation.quote);
      const citationKey = `${citation.index}-${textHash}`;

      usedCitations.add(citationKey);
      const displayNum = Array.from(usedCitations).indexOf(citationKey) + 1;
      return `"${quote}"[${displayNum}-${textHash}]()`;
    }

    if (citationIndex) {
      const indexBasedCitation = citations.find((c) => c.index === citationIndex);
      if (indexBasedCitation) {
        const textHash = generateTextHash(indexBasedCitation.quote);
        const citationKey = `${indexBasedCitation.index}-${textHash}`;

        usedCitations.add(citationKey);
        const displayNum = Array.from(usedCitations).indexOf(citationKey) + 1;
        return `"${quote}"[${displayNum}-${textHash}]()`;
      }
    }

    return `"${quote}"`;
  });

  processedContent = processedContent.replace(/\[(\d+)\]/g, () => {
    return "";
  });

  return processedContent;
}

export function buildCitationMap(messages: Message[]): Map<string, Citation> {
  const citationMap = new Map<string, Citation>();

  messages.forEach((message) => {
    if (message.citations && Array.isArray(message.citations)) {
      message.citations.forEach((citation: Citation) => {
        const textHash = generateTextHash(citation.quote);
        citationMap.set(textHash, { ...citation, id: textHash });
      });
    }
  });

  return citationMap;
}

export function processMessagesWithCitations(messages: Message[]): Message[] {
  return messages.map((message) => {
    if (message.role === "assistant" && message.citations && Array.isArray(message.citations)) {
      const processedContent = processCitationsForDisplay(message.content, message.citations);
      return { ...message, content: processedContent };
    }
    return message;
  });
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

export function removeExistingHighlights(): void {
  const existingHighlights = document.querySelectorAll(".highlighted-text");
  existingHighlights.forEach((highlight) => {
    const parent = highlight.parentNode;
    parent?.replaceChild(document.createTextNode(highlight.textContent || ""), highlight);
    parent?.normalize();
  });
}

export function createHighlightedSpan(text: string): HTMLSpanElement {
  const highlightSpan = document.createElement("span");
  highlightSpan.className = "highlighted-text bg-yellow-200 text-yellow-900";
  highlightSpan.textContent = text;
  return highlightSpan;
}

export function applyHighlightToElement(
  targetElement: HTMLElement,
  originalText: string,
  highlightText: string,
  startIndex: number
): void {
  const beforeText = originalText.substring(0, startIndex);
  const afterText = originalText.substring(startIndex + highlightText.length);

  targetElement.innerHTML = "";

  if (beforeText) {
    targetElement.appendChild(document.createTextNode(beforeText));
  }

  const highlightSpan = createHighlightedSpan(highlightText);
  targetElement.appendChild(highlightSpan);

  if (afterText) {
    targetElement.appendChild(document.createTextNode(afterText));
  }
}

export function consolidateTextSpans(textSpans: NodeListOf<HTMLElement>): HTMLElement | null {
  if (textSpans.length <= 1) {
    return null;
  }

  const combinedText = Array.from(textSpans)
    .map((span) => span.textContent || "")
    .join("");

  const outerSpan = document.createElement("span");
  outerSpan.setAttribute("data-slate-node", "text");

  const leafSpan = document.createElement("span");
  leafSpan.setAttribute("data-slate-leaf", "true");

  const stringSpan = document.createElement("span");
  stringSpan.setAttribute("data-slate-string", "true");
  stringSpan.textContent = combinedText;

  leafSpan.appendChild(stringSpan);
  outerSpan.appendChild(leafSpan);

  const parentElement = textSpans[0].parentElement;

  textSpans.forEach((span) => {
    if (span.parentElement) {
      span.parentElement.removeChild(span);
    }
  });

  if (parentElement) {
    parentElement.appendChild(outerSpan);
    return stringSpan;
  }

  return null;
}

export function highlightCitationInElement(
  element: Element,
  citationSnippet: string,
  onComplete?: () => void
): (() => void) | null {
  const textSpans = element.querySelectorAll('[data-slate-node="text"]') as NodeListOf<HTMLElement>;
  const normalizedSnippet = normalizeText(citationSnippet);

  if (textSpans.length > 1) {

    const combinedText = Array.from(textSpans)
      .map((span) => span.textContent || "")
      .join("");

    const consolidatedSpan = consolidateTextSpans(textSpans);
    if (!consolidatedSpan) {
      return null;
    }

    const normalizedTextContent = normalizeText(combinedText);

    if (normalizedTextContent.includes(normalizedSnippet)) {
      const startIndex = normalizedTextContent.indexOf(normalizedSnippet);

      if (startIndex !== -1) {
        const highlightText = combinedText.substring(startIndex, startIndex + citationSnippet.length) || citationSnippet;
        applyHighlightToElement(consolidatedSpan, combinedText, highlightText, startIndex);

        element.scrollIntoView({ behavior: "smooth", block: "center" });

        const timeout = setTimeout(() => {
          if (onComplete) onComplete();
          removeExistingHighlights();
        }, 5000);

        return () => {
          clearTimeout(timeout);
        };
      }
    }
  } else if (textSpans.length === 1) {
    const textSpan = textSpans[0].querySelector('[data-slate-string="true"]') as HTMLElement;
    const normalizedTextContent = normalizeText(textSpan?.textContent || "");

    if (textSpan && normalizedTextContent.includes(normalizedSnippet)) {
      const textContent = textSpan.textContent;
      const startIndex = normalizedTextContent.indexOf(normalizedSnippet);

      if (startIndex !== -1 && textContent) {
        const highlightText = textContent.substring(startIndex, startIndex + citationSnippet.length) || citationSnippet;
        applyHighlightToElement(textSpan, textContent, highlightText, startIndex);

        element.scrollIntoView({ behavior: "smooth", block: "center" });

        const timeout = setTimeout(() => {
          if (onComplete) onComplete();
          removeExistingHighlights();
        }, 7000);

        return () => {
          clearTimeout(timeout);
        };
      }
    }
  }

  return null;
}
