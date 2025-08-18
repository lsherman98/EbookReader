import { Message } from "@/components/ui/chat-message";
import { Citation } from "../types";
import { Node } from "platejs";
import { calculateTextSimilarity, generateTextHash, normalizeText } from "./utils";

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