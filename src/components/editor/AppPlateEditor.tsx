/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAddHighlight, useDeleteHighlightByHash, useUpdateChapter } from "@/lib/api/mutations";
import { ChaptersRecord } from "@/lib/pocketbase-types";
import { useCitationStore } from "@/lib/stores/citation-store";
import { useSelectedHighlightStore } from "@/lib/stores/selected-highlight-store";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { DisableTextInput } from "./plugins/disable-text-input";
import { FloatingToolbarKit } from "./plugins/floating-toolbar-kit";
import { createStaticEditor, Node, Range, serializeHtml, Value } from "platejs";
import { BaseEditorKit } from "./plugins/editor-base-kit";
import { Editor, EditorContainer } from "../ui/editor";
import { useNavigationHistoryStore } from "@/lib/stores/navigation-history-store";
import { useNavigate } from "@tanstack/react-router";
import { GoBackButton } from "../ui/go-back-button";
import {
  combineHighlightText,
  createAdjustedSelection,
  createHighlightHash,
  findAdjacentHighlights,
  findHighlightedElementInEditor,
  findMatchingMarksInEditor,
  selectMarksInEditor,
} from "@/lib/utils/highlights";
import { calculateTextSimilarity, scrollElementIntoView } from "@/lib/utils/utils";
import { findBestMatchingNode, highlightCitationInElement } from "@/lib/utils/citations";

export function AppPlateEditor({ chapter }: { chapter?: ChaptersRecord }) {
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>("");
  const currentEditorSelection = useRef<Range | null>(null);

  const navigate = useNavigate();
  const updateChapterMutation = useUpdateChapter();
  const addHighlightMutation = useAddHighlight();
  const deleteHighlightByHashMutation = useDeleteHighlightByHash();
  const { canGoBack, previousLocation, setPreviousLocation } = useNavigationHistoryStore();
  const { currentCitation, setCurrentCitation } = useCitationStore();
  const { selectedHighlight, setSelectedHighlight } = useSelectedHighlightStore();

  const plateEditor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });

  const staticHtmlEditor = createStaticEditor({
    plugins: BaseEditorKit,
  });

  useEffect(() => {
    setTimeout(() => {
      if (selectedHighlight && chapter && selectedHighlight.chapter === chapter.id && selectedHighlight.text) {
        const highlightedElement = findHighlightedElementInEditor(plateEditor.children, selectedHighlight.text);

        if (highlightedElement?.id) {
          scrollElementIntoView(highlightedElement.id as string);
        }
        setSelectedHighlight(undefined);
      }
    }, 200);
  }, [selectedHighlight, chapter, setSelectedHighlight, chapterHtmlContent, plateEditor.children]);

  const handleEditorValueChange = useCallback(
    async (value: any) => {
      if (!chapter) return;
      if (value && value.editor.selection) {
        const htmlContent = await serializeHtml(staticHtmlEditor, {
          props: { value: value.value as Value },
          stripDataAttributes: true,
        });
        setChapterHtmlContent(htmlContent);
        updateChapterMutation.mutateAsync({ chapterId: chapter.id, content: htmlContent });
      }
    },
    [chapter, staticHtmlEditor, updateChapterMutation],
  );

  const handleHighlightClick = (event: any) => {
    const clickedElement = event.target;
    const highlightText = event.target.innerText;
    const isHighlightClicked = clickedElement.parentElement.classList.contains("slate-highlight");

    if (!isHighlightClicked) return;

    const parentElement: HTMLElement = clickedElement.parentElement.parentElement.parentElement.parentElement;
    const { previousHighlight, nextHighlight } = findAdjacentHighlights(parentElement);

    const combinedText = combineHighlightText(highlightText, previousHighlight, nextHighlight);
    const matchingMarks = findMatchingMarksInEditor(plateEditor.children, combinedText);

    selectMarksInEditor(plateEditor, matchingMarks);
  };

  const handleHighlightButtonClick = useCallback(async () => {
    if (!plateEditor || !currentEditorSelection.current || !chapter) return;

    const hasHighlightMark = plateEditor.api.hasMark("highlight");
    const selection = currentEditorSelection.current;
    const selectedText = plateEditor.api.string(currentEditorSelection.current);

    if (hasHighlightMark) {
      const highlightHash = await createHighlightHash(chapter.book, chapter.id, selection, selectedText);
      deleteHighlightByHashMutation.mutate(highlightHash);
    } else {
      const adjustedSelection = createAdjustedSelection(selection);
      const highlightHash = await createHighlightHash(chapter.book, chapter.id, adjustedSelection, selectedText);

      addHighlightMutation.mutate({
        bookId: chapter.book,
        chapterId: chapter.id,
        text: selectedText,
        selection: adjustedSelection,
        hash: highlightHash,
      });
    }
  }, [addHighlightMutation, chapter, deleteHighlightByHashMutation, plateEditor]);

  const handleGoBack = useCallback(() => {
    if (!previousLocation) return;

    setCurrentCitation(undefined);
    setSelectedHighlight(undefined);

    navigate({
      to: "/reader/{-$bookId}",
      params: { bookId: previousLocation.bookId },
      search: { chapter: previousLocation.chapterId },
      replace: true,
    });

    setTimeout(() => {
      if (previousLocation.elementId) {
        scrollElementIntoView(previousLocation.elementId);
      }
    }, 500);

    setPreviousLocation(undefined);
  }, [previousLocation, setCurrentCitation, setSelectedHighlight, navigate, setPreviousLocation]);

  useEffect(() => {
    window.addEventListener("highlight-clicked", handleHighlightButtonClick);
    return () => {
      window.removeEventListener("highlight-clicked", handleHighlightButtonClick);
    };
  }, [handleHighlightButtonClick]);

  const handleEditorSelectionChange = useCallback((event: any) => {
    currentEditorSelection.current = event.selection as Range;
  }, []);

  useEffect(() => {
    if (!plateEditor || !chapterHtmlContent) return;
    const deserializedValue = plateEditor.api.html.deserialize({ element: chapterHtmlContent });
    plateEditor.tf.setValue(deserializedValue as Value);
    staticHtmlEditor.tf.setValue(deserializedValue as Value);
  }, [plateEditor, staticHtmlEditor, chapterHtmlContent]);

  useEffect(() => {
    if (!chapter) return;
    setChapterHtmlContent(chapter.content || "<p>Loading...</p>");
  }, [chapter]);

  useEffect(() => {
    if (!currentCitation || !chapterHtmlContent || !plateEditor) return;

    const timer = setTimeout(() => {
      let citationNode: Node = plateEditor.children[parseInt(currentCitation.index)];
      let element = document.querySelector(`[data-block-id="${citationNode?.id}"]`);

      if (!element || calculateTextSimilarity(currentCitation.quote, element.textContent || "") < 0.4) {
        const matchingNode = findBestMatchingNode(plateEditor.children, currentCitation.quote);
        if (matchingNode) {
          citationNode = matchingNode;
        }
      }

      element = document.querySelector(`[data-block-id="${citationNode.id}"]`);
      if (!element) return;

      const cleanup = highlightCitationInElement(element, currentCitation.quote, () => setCurrentCitation(undefined));
      return cleanup;
    }, 500);

    return () => clearTimeout(timer);
  }, [currentCitation, plateEditor.children, setCurrentCitation, chapterHtmlContent, plateEditor]);

  return (
    <Plate editor={plateEditor} onValueChange={handleEditorValueChange} onSelectionChange={handleEditorSelectionChange}>
      <EditorContainer className="h-full w-full max-h-[calc(100vh-50px)] overflow-hidden caret-transparent">
        <Editor onClick={handleHighlightClick} />
      </EditorContainer>
      {canGoBack() ? (
        <div className="fixed bottom-6 left-2/3 transform -translate-x-1/3 z-50">
          <GoBackButton onClick={handleGoBack} />
        </div>
      ) : null}
    </Plate>
  );
}
