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
import { Node } from "platejs";
import { removeExistingHighlights, highlightCitationInElement } from "@/lib/utils";

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

  const [htmlString, setHtmlString] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [chapters, setChapters] = useState<ChaptersRecord[]>([]);

  const { data: lastReadBook } = useGetLastReadBook();
  const { data: book } = useGetBookById(bookId && bookId !== "undefined" ? bookId : lastReadBook?.book || "");
  const { data: chapter } = useGetChapterById(chapterId);

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
    if (book) setChapters(book.expand.chapters);
  }, [book]);

  useEffect(() => {
    if (chapter) {
      setHtmlString(chapter.content || "<p>Loading...</p>");
    }
  }, [chapter]);

  useEffect(() => {
    if ((!bookId || bookId === "undefined") && lastReadBook?.book) {
      navigateTo(lastReadBook.book, undefined, false);
    }
  }, [bookId, lastReadBook?.book, navigate, navigateTo]);

  useEffect(() => {
    const chapterId = search.chapter || book?.current_chapter || book?.chapters?.[0];

    if (chapterId) {
      setChapterId(chapterId);

      if (!search.chapter) {
        navigateTo(bookId, chapterId, true);
      }
    }
  }, [book, search.chapter, navigateTo, bookId]);

  const handleChapterClick = (chapterId: string) => {
    setChapterId(chapterId);
    navigateTo(bookId, chapterId, false);
  };

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
        <PlateEditor htmlString={htmlString} bookId={bookId} chapterId={chapterId} />
      </PlateController>
    </div>
  );
}

function PlateEditor({
  htmlString = "",
  bookId,
  chapterId,
}: {
  htmlString?: string;
  bookId: string;
  chapterId: string;
}) {
  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });

  const { currentCitation, setCurrentCitation } = useCitationStore();

  useEffect(() => {
    if (!editor || !htmlString) return;
    const value = editor.api.html.deserialize({ element: htmlString });
    // @ts-expect-error ignore
    editor.tf.setValue(value);
  }, [editor, htmlString]);

  useEffect(() => {
    if (!editor || !currentCitation) return;

    const node: Node = editor.children[parseInt(currentCitation.index)];
    // editor.tf.select(node);

    const elementId = node?.id;
    const element = document.querySelector(`[data-block-id="${elementId}"]`);

    if (element) {
      removeExistingHighlights();

      const cleanup = highlightCitationInElement(element, currentCitation.text, () =>
        setCurrentCitation(undefined),
      );

      return cleanup || undefined;
    }
  }, [editor, htmlString, bookId, chapterId, currentCitation, setCurrentCitation]);

  return (
    <Plate editor={editor}>
      <EditorContainer className="h-full w-full max-h-[calc(100vh-50px)] overflow-hidden caret-transparent">
        <Editor />
      </EditorContainer>
    </Plate>
  );
}
