import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { pb } from "./pocketbase";
import { toast } from "@/hooks/use-toast";
import { Citation } from "./types";
import { Message } from "@/components/ui/chat-message";
import { Descendant, Node, PointApi, Range } from "platejs";
import { PlateEditor } from "platejs/react";

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

export const formatHighlightDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

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
  let normalized = text.toLowerCase().replace(/\s+/g, " ").replace(/["'“”‘’]/g, "");


  if (forCitation) {
    normalized = normalized.replace(/[^\w\s]/g, "");
  } else {
    normalized = normalized.replace(/[;,]/g, ".")
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

  processedContent = processedContent.replace(/"([^"]+)"\s*\[(\d+)\]/g, (_, quote, citationIndex) => {
    const potentialMatches = citations.filter((c) => c.index === citationIndex);
    const bestMatch = findBestCitation(quote, potentialMatches);

    if (bestMatch) {
      const textHash = generateTextHash(bestMatch.quote);
      const citationKey = `${bestMatch.index}-${textHash}`;

      if (!usedCitations.has(citationKey)) {
        usedCitations.add(citationKey);
      }
      const displayNum = Array.from(usedCitations).indexOf(citationKey) + 1;
      return `"${quote}"[${displayNum}-${textHash}]()`;
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
  const normalizedSnippet = normalizeText(citationSnippet, true);

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
        }, 10000);

        return () => {
          clearTimeout(timeout);
        };
      }
    }
  } else if (textSpans.length === 1) {
    const textSpan = textSpans[0].querySelector('[data-slate-string="true"]') as HTMLElement;
    const normalizedTextContent = normalizeText(textSpan?.textContent || "", true);
    if (textSpan && calculateTextSimilarity(normalizedSnippet, normalizedTextContent) > 0.5) {
      const textContent = textSpan.textContent;
      const startIndex = normalizedTextContent.indexOf(normalizedSnippet);

      if (startIndex !== -1 && textContent) {
        const highlightText = textContent.substring(startIndex, startIndex + citationSnippet.length) || citationSnippet;
        applyHighlightToElement(textSpan, textContent, highlightText, startIndex);

        element.scrollIntoView({ behavior: "smooth", block: "center" });

        const timeout = setTimeout(() => {
          if (onComplete) onComplete();
          removeExistingHighlights();
        }, 10000);

        return () => {
          clearTimeout(timeout);
        };
      }
    }
  }

  return null;
}

export async function createHighlightHash(bookId: string, chapterId: string, selection: Range, text: string) {
  const dataToHash = `${bookId}-${chapterId}-${selection.anchor.path}-${selection.focus.path}-${text}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const findHighlightedElementInEditor = (editorChildren: Node[], highlightText: string): Node | undefined => {
  for (const node of editorChildren) {
    if (node.children) {
      for (const child of node.children as Descendant[]) {
        if (child.highlight && child.text === highlightText) {
          return node;
        }
      }
    }
  }
  return undefined;
};

export const scrollElementIntoView = (elementId: string): void => {
  const element = document.querySelector(`[data-block-id="${elementId}"]`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

export const getElementAtViewportCenter = (): string | null => {
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;

  let el = document.elementFromPoint(x, y)
  while (el) {
    if (el.hasAttribute("data-block-id")) {
      break
    }
    el = el.parentElement;
  }

  if (!el) return null;
  return el.getAttribute("data-block-id");
};

export const findAdjacentHighlights = (parentElement: HTMLElement) => {
  let previousHighlight: Element | null = null;
  let nextHighlight: Element | null = null;

  let currentElement = parentElement.previousSibling as Element;
  while (currentElement) {
    const highlight = currentElement.querySelector?.(".slate-highlight");
    if (highlight) {
      const belongsToPreviousHighlight = currentElement.textContent?.trim().endsWith(highlight.textContent?.trim());
      if (!belongsToPreviousHighlight) break;
      previousHighlight = highlight;
      break;
    } else if (currentElement.textContent?.trim()) {
      break;
    }
    currentElement = currentElement.previousSibling as Element;
  }

  currentElement = parentElement.nextSibling as Element;
  while (currentElement) {
    const highlight = currentElement.querySelector?.(".slate-highlight");
    if (highlight) {
      const belongsToNextHighlight = currentElement.textContent?.trim().startsWith(highlight.textContent?.trim());
      if (!belongsToNextHighlight) break;
      nextHighlight = highlight;
      break;
    } else if (currentElement.textContent?.trim()) {
      break;
    }
    currentElement = currentElement.nextSibling as Element;
  }

  return { previousHighlight, nextHighlight };
};

export const combineHighlightText = (
  baseText: string,
  previousHighlight: Element | null,
  nextHighlight: Element | null,
): string => {
  let combinedText = baseText;

  if (nextHighlight) {
    combinedText += nextHighlight.textContent;
  }

  if (previousHighlight) {
    combinedText = previousHighlight.textContent + combinedText;
  }

  return combinedText;
};

export const findMatchingMarksInEditor = (editorChildren: Node[], highlightText: string): Descendant[] => {
  const matchingMarks: Descendant[] = [];

  editorChildren.forEach((node: Node) => {
    if (node.children) {
      (node.children as Descendant[]).forEach((child: Descendant) => {
        if (child.highlight && highlightText.includes(child.text as string)) {
          matchingMarks.push(child);
        }
      });
    }
  });

  return matchingMarks;
};

export const selectMarksInEditor = (editor: PlateEditor, marks: Descendant[]): void => {
  if (marks.length === 1) {
    editor.tf.select(marks[0]);
  } else {
    const firstMark = marks[0];
    const firstPath = editor.api.findPath(firstMark);
    const firstPoint = PointApi.get(firstPath);

    const lastMark = marks[marks.length - 1];
    let lastPath = editor.api.findPath(lastMark);
    lastPath = [lastPath![0], lastPath![1] + 1];
    const lastPoint = PointApi.get(lastPath);

    editor.tf.select({ anchor: firstPoint!, focus: lastPoint! });
  }
};

export const createAdjustedSelection = (originalSelection: Range): Range => {
  if (originalSelection.anchor.offset !== 0) {
    return {
      anchor: {
        path: [originalSelection.anchor.path[0], originalSelection.anchor.path[1] + 1],
        offset: originalSelection.anchor.offset,
      },
      focus: {
        path: [originalSelection.focus.path[0], originalSelection.focus.path[1] + 1],
        offset: originalSelection.focus.offset,
      },
    };
  }
  return originalSelection;
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

export const findBestMatchingNode = (children: Node[], quote: string, threshold: number = 0.4): Node | null => {
  let bestMatch: { node: Node; score: number } | null = null;

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const element = document.querySelector(`[data-block-id="${childNode.id}"]`);

    if (element?.textContent) {
      const similarity = calculateTextSimilarity(quote, element.textContent);
      if (similarity === 1.0) {
        bestMatch = { node: childNode, score: similarity };
        break
      }

      if (similarity >= threshold && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { node: childNode, score: similarity };
      }
    }
  }

  return bestMatch?.node || null;
};