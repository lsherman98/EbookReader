import { createFileRoute } from "@tanstack/react-router";
import { useGetBookById, useGetChapterById, useGetLastReadBook } from "@/lib/api/queries";
import { Plate, PlateController, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChaptersRecord } from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import { SquareMenu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { DisableTextInput } from "@/components/editor/plugins/disable-text-input";
import { useCitationStore } from "@/lib/stores/citation-store";
import { createStaticEditor, Descendant, Node, PointApi, Range, serializeHtml, Value } from "platejs";
import { removeExistingHighlights, highlightCitationInElement } from "@/lib/utils";
import { BaseEditorKit } from "@/components/editor/plugins/editor-base-kit";
import { useAddHighlight, useDeleteHighlight, useUpdateChapter } from "@/lib/api/mutations";
import { useCurrentChapterStore } from "@/lib/stores/current-chapter-store";
import { useSelectedHighlightStore } from "@/lib/stores/selected-highlight-store";

async function createHighlightHash(bookId: string, chapterId: string, selection: Range, text: string) {
  const dataToHash = `${bookId}-${chapterId}-${selection.anchor.path}-${selection.focus.path}-${text}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/_app/reader/{-$bookId}")({
  component: Index,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      chapter: (search.chapter as string) || undefined,
    };
  },
});

function Index() {
  const { bookId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { currentChapterId, setCurrentChapterId } = useCurrentChapterStore();
  const { selectedHighlight } = useSelectedHighlightStore();
  const [chapters, setChapters] = useState<ChaptersRecord[]>([]);

  const { data: book } = useGetBookById(bookId);
  const { data: chapter } = useGetChapterById(currentChapterId);
  const { data: lastReadBook } = useGetLastReadBook();

  const navigateTo = useCallback(
    (bookId: string, chapterId: string | undefined, replace: boolean) => {
      navigate({
        to: "/reader/{-$bookId}",
        params: { bookId },
        search: { chapter: chapterId },
        replace: replace,
      });
    },
    [navigate],
  );

  const handleChapterClick = useCallback(
    (chapterId: string) => {
      setCurrentChapterId(chapterId);
      if (!bookId) return;
      navigateTo(bookId, chapterId, false);
    },
    [setCurrentChapterId, navigateTo, bookId],
  );

  useEffect(() => {
    if ((!bookId && lastReadBook?.book) || (bookId === "undefined" && lastReadBook?.book)) {
      navigateTo(lastReadBook.book, lastReadBook.chapter, true);
    }
  }, [bookId, lastReadBook, navigateTo]);

  useEffect(() => {
    if (!book) return;
    setChapters(book.expand.chapters);
  }, [book]);

  useEffect(() => {
    if (!bookId || !book) return;

    const chapterId = search.chapter || book?.current_chapter || book?.chapters?.[0];
    if (!chapterId) {
      return;
    }

    setCurrentChapterId(chapterId);

    if (!search.chapter) {
      navigateTo(bookId, chapterId, true);
    }
  }, [bookId, book, search.chapter, navigateTo, setCurrentChapterId]);

  useEffect(() => {
    if (selectedHighlight && selectedHighlight.chapter && selectedHighlight.chapter !== currentChapterId) {
      handleChapterClick(selectedHighlight.chapter);
    }
  }, [currentChapterId, handleChapterClick, selectedHighlight]);

  return (
    <div className="h-full w-full flex">
      <div className="p-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="">
              <SquareMenu />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <ul className="p-1 flex flex-col gap-2 max-h-96 overflow-y-auto overflow-x-hidden no-scrollbar">
              {chapters?.map((chapter) => (
                <li
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter.id)}
                  className={`cursor-pointer p-2 rounded hover:bg-accent ${chapter.id === currentChapterId ? "bg-accent" : ""}`}
                >
                  {chapter.title}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <PlateController>
        <PlateEditor chapter={chapter} />
      </PlateController>
    </div>
  );
}

function PlateEditor({ chapter }: { chapter?: ChaptersRecord }) {
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
