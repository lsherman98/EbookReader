import { Descendant, Node, PointApi, Range } from "platejs";
import { PlateEditor } from "platejs/react";

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

export async function createHighlightHash(bookId: string, chapterId: string, selection: Range, text: string) {
    const dataToHash = `${bookId}-${chapterId}-${selection.anchor.path}-${selection.focus.path}-${text}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToHash);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}