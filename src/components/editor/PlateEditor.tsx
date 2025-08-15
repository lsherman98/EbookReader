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
import { createStaticEditor, Descendant, Node, PointApi, Range, serializeHtml, Value } from "platejs";
import { BaseEditorKit } from "./plugins/editor-base-kit";
import { createHighlightHash, highlightCitationInElement, removeExistingHighlights } from "@/lib/utils";
import { Editor, EditorContainer } from "../ui/editor";

export function PlateEditor({ chapter }: { chapter?: ChaptersRecord }) {
  const [htmlString, setHtmlString] = useState<string>("");
  const currentSelection = useRef<Range | null>(null);

  const { currentCitation, setCurrentCitation } = useCitationStore();
  const { selectedHighlight, setSelectedHighlight } = useSelectedHighlightStore();
  const updateChapterMutation = useUpdateChapter();
  const addHighlightMutation = useAddHighlight();
  const deleteHighlightMutation = useDeleteHighlight();

  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });

  const staticEditor = createStaticEditor({
    plugins: BaseEditorKit,
  });

  useEffect(() => {
    if (selectedHighlight && chapter && selectedHighlight.chapter === chapter.id) {
      let highlightElement: Node | undefined;
      editor.children.forEach((n) => {
        n.children.forEach((c) => {
          if (c.highlight && c.text === selectedHighlight.text) {
            highlightElement = n;
          }
        });
      });

      const elementId = highlightElement?.id;
      const element = document.querySelector(`[data-block-id="${elementId}"]`);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setSelectedHighlight(undefined);
    }
  }, [selectedHighlight, chapter, setSelectedHighlight, htmlString, editor.children]);

  const handleValueChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (value: any) => {
      if (!chapter) return;
      if (value && value.editor.selection) {
        const html = await serializeHtml(staticEditor, {
          props: { value: value.value as Value },
          stripDataAttributes: true,
        });
        setHtmlString(html);
        updateChapterMutation.mutateAsync({ chapterId: chapter.id, content: html });
      }
    },
    [chapter, staticEditor, updateChapterMutation],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorClick = (e: any) => {
    const el = e.target;
    let text = e.target.innerText;
    const isHighlight = el.parentElement.classList.contains("slate-highlight");

    if (!isHighlight) return;

    const parent: HTMLElement = el.parentElement.parentElement.parentElement.parentElement;
    const textContent = parent?.nextSibling?.childNodes[0].textContent;
    text += textContent;

    const marks: Descendant[] = [];
    editor.children.forEach((n) => {
      n.children.forEach((c) => {
        if (c.highlight && text.includes(c.text)) {
          marks.push(c);
        }
      });
    });

    if (marks.length === 1) {
      editor.tf.select(marks[0]);
    } else {
      const first = marks[0];
      const firstPath = editor.api.findPath(first);
      const firstPoint = PointApi.get(firstPath);

      const last = marks[marks.length - 1];
      let lastPath = editor.api.findPath(last);
      lastPath = [lastPath![0], lastPath![1] + 1];
      const lastPoint = PointApi.get(lastPath);

      editor.tf.select({ anchor: firstPoint!, focus: lastPoint! });
    }
  };

  const handleHighlightClicked = useCallback(async () => {
    if (!editor || !currentSelection.current || !chapter) return;
    const hasMark = editor.api.hasMark("highlight");
    const selection = currentSelection.current;
    const text = editor.api.string(currentSelection.current);

    if (hasMark) {
      const hash = await createHighlightHash(chapter.book, chapter.id, selection, text);
      deleteHighlightMutation.mutate({
        hash,
      });
    } else {
      let newSelection = selection;
      if (selection.anchor.offset !== 0) {
        newSelection = {
          anchor: {
            path: [selection.anchor.path[0], selection.anchor.path[1] + 1],
            offset: selection.anchor.offset,
          },
          focus: {
            path: [selection.focus.path[0], selection.focus.path[1] + 1],
            offset: selection.focus.offset,
          },
        };
      }

      const hash = await createHighlightHash(chapter.book, chapter.id, newSelection, text);

      addHighlightMutation.mutate({
        bookId: chapter.book,
        chapterId: chapter.id,
        text,
        selection: newSelection,
        hash,
      });
    }
  }, [addHighlightMutation, chapter, deleteHighlightMutation, editor]);

  useEffect(() => {
    window.addEventListener("highlight-clicked", handleHighlightClicked);
    return () => {
      window.removeEventListener("highlight-clicked", handleHighlightClicked);
    };
  }, [handleHighlightClicked]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectionChange = useCallback((event: any) => {
    currentSelection.current = event.selection as Range;
  }, []);

  useEffect(() => {
    if (!editor || !htmlString) return;
    const value = editor.api.html.deserialize({ element: htmlString });
    editor.tf.setValue(value as Value);
    staticEditor.tf.setValue(value as Value);
  }, [editor, staticEditor, htmlString]);

  useEffect(() => {
    if (!chapter) return;
    setHtmlString(chapter.content || "<p>Loading...</p>");
  }, [chapter]);

  useEffect(() => {
    if (!currentCitation || !htmlString || !editor) return;

    const timer = setTimeout(() => {
      const node: Node = editor.children[parseInt(currentCitation.index)];
      // editor.tf.select(node);

      const elementId = node?.id;
      const element = document.querySelector(`[data-block-id="${elementId}"]`);
      if (!element) {
        return;
      }

      removeExistingHighlights();
      const cleanup = highlightCitationInElement(element, currentCitation.quote, () => setCurrentCitation(undefined));

      return cleanup;
    }, 100);

    return () => clearTimeout(timer);
  }, [currentCitation, editor.children, setCurrentCitation, htmlString, editor]);

  return (
    <Plate editor={editor} onValueChange={handleValueChange} onSelectionChange={handleSelectionChange}>
      <EditorContainer className="h-full w-full max-h-[calc(100vh-50px)] overflow-hidden caret-transparent">
        <Editor onClick={handleEditorClick} />
      </EditorContainer>
    </Plate>
  );
}
