import { createFileRoute } from "@tanstack/react-router";
import { useGetBookById, useGetChapterById, useGetLastReadBook } from "@/lib/api/queries";
import { Plate, PlateController, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChaptersRecord } from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import { SquareMenu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { DisableTextInput } from "@/components/editor/plugins/disable-text-input";
import { useCitationStore } from "@/lib/stores/citation-store";
import { createStaticEditor, Node, Range, serializeHtml, Value } from "platejs";
import { removeExistingHighlights, highlightCitationInElement } from "@/lib/utils";
import { BaseEditorKit } from "@/components/editor/plugins/editor-base-kit";
import { useUpdateChapter } from "@/lib/api/mutations";

export const Route = createFileRoute("/_app/reader/$bookId")({
  component: Index,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      chapter: (search.chapter as string) || undefined,
    };
  },
});

function Index() {
  const bookId = Route.useParams().bookId;
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [chapterId, setChapterId] = useState<string>("");
  const [chapters, setChapters] = useState<ChaptersRecord[]>([]);

  const { data: lastReadBook } = useGetLastReadBook();
  const { data: book } = useGetBookById(bookId && bookId !== "undefined" ? bookId : lastReadBook?.book || "");
  const { data: chapter } = useGetChapterById(chapterId);

  const handleChapterClick = (chapterId: string) => {
    setChapterId(chapterId);
    navigateTo(bookId, chapterId, false);
  };

  const navigateTo = useCallback(
    (bookId: string, chapterId: string | undefined, replace: boolean) => {
      navigate({
        to: "/reader/$bookId",
        params: { bookId },
        search: { chapter: chapterId },
        replace: replace,
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (!book) return;
    setChapters(book.expand.chapters);
  }, [book]);

  useEffect(() => {
    if ((!bookId || bookId === "undefined") && lastReadBook?.book) {
      navigateTo(lastReadBook.book, lastReadBook.chapter, false);
      return;
    }

    const chapterId = search.chapter || lastReadBook?.chapter || book?.chapters?.[0];
    if (!chapterId) return;
    setChapterId(chapterId);

    if (!search.chapter) {
      navigateTo(bookId, chapterId, true);
    }
  }, [bookId, lastReadBook, book, search.chapter, navigateTo]);

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
                  className={`cursor-pointer p-2 rounded hover:bg-accent ${chapter.id === chapterId ? "bg-accent" : ""}`}
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
  const [currentSelection, setCurrentSelection] = useState<Range | null>(null);

  const { currentCitation, setCurrentCitation } = useCitationStore();
  const updateChapterMutation = useUpdateChapter();

  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });

  const staticEditor = createStaticEditor({
    plugins: BaseEditorKit,
  });

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

  useEffect(() => {
    const handleHighlightClicked = () => {
      console.log("Highlight clicked event received in PlateEditor");
      console.log("Current selection:", currentSelection);
    };
    window.addEventListener("highlight-clicked", handleHighlightClicked);
    return () => {
      window.removeEventListener("highlight-clicked", handleHighlightClicked);
    };
  }, [currentSelection]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectionChange = useCallback((event: any) => {
    setCurrentSelection(event.range as Range);
  }, []);

  useEffect(() => {
    if (!editor || !htmlString) return;
    const value = editor.api.html.deserialize({ element: htmlString });
    editor.tf.setValue(value as Value);
    staticEditor.tf.setValue(value as Value);
  }, [editor, htmlString, staticEditor.tf]);

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
        console.log("Element not found for citation:", currentCitation.index, elementId);
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
        <Editor />
      </EditorContainer>
    </Plate>
  );
}
