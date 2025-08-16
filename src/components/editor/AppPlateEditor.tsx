/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAddHighlight, useDeleteHighlight, useUpdateChapter } from "@/lib/api/mutations";
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
import { combineHighlightText, createAdjustedSelection, createHighlightHash, findAdjacentHighlights, findHighlightedElementInEditor, findMatchingMarksInEditor, highlightCitationInElement, removeExistingHighlights, scrollElementIntoView, selectMarksInEditor } from "@/lib/utils";
import { Editor, EditorContainer } from "../ui/editor";

export function AppPlateEditor({ chapter }: { chapter?: ChaptersRecord }) {
  const [chapterHtmlContent, setChapterHtmlContent] = useState<string>("");
  const currentEditorSelection = useRef<Range | null>(null);

  const { currentCitation, setCurrentCitation } = useCitationStore();
  const { selectedHighlight, setSelectedHighlight } = useSelectedHighlightStore();
  const updateChapterMutation = useUpdateChapter();
  const addHighlightMutation = useAddHighlight();
  const deleteHighlightMutation = useDeleteHighlight();

  const plateEditor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });

  const staticHtmlEditor = createStaticEditor({
    plugins: BaseEditorKit,
  });

  useEffect(() => {
    if (selectedHighlight && chapter && selectedHighlight.chapter === chapter.id && selectedHighlight.text) {
      const highlightedElement = findHighlightedElementInEditor(plateEditor.children, selectedHighlight.text);

      if (highlightedElement?.id) {
        scrollElementIntoView(highlightedElement.id as string);
      }
      setSelectedHighlight(undefined);
    }
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
      deleteHighlightMutation.mutate({ hash: highlightHash });
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
  }, [addHighlightMutation, chapter, deleteHighlightMutation, plateEditor]);

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
      const citationNode: Node = plateEditor.children[parseInt(currentCitation.index)];
      const elementId = citationNode?.id;
      const element = document.querySelector(`[data-block-id="${elementId}"]`);

      if (!element) return;

      removeExistingHighlights();
      const cleanup = highlightCitationInElement(element, currentCitation.quote, () => setCurrentCitation(undefined));

      return cleanup;
    }, 100);

    return () => clearTimeout(timer);
  }, [currentCitation, plateEditor.children, setCurrentCitation, chapterHtmlContent, plateEditor]);

  return (
    <Plate editor={plateEditor} onValueChange={handleEditorValueChange} onSelectionChange={handleEditorSelectionChange}>
      <EditorContainer className="h-full w-full max-h-[calc(100vh-50px)] overflow-hidden caret-transparent">
        <Editor onClick={handleHighlightClick} />
      </EditorContainer>
    </Plate>
  );
}
