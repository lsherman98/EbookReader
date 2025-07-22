import { createFileRoute } from "@tanstack/react-router";
import { useGetBookById, useGetChapterById, useGetLastReadBook } from "@/lib/api/queries";
import { Plate, PlateController, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChaptersRecord } from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import { SquareMenu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { DisableTextInput } from "@/components/editor/plugins/disable-text-input";

export const Route = createFileRoute("/_app/reader/$bookId")({
  component: Index,
});

function Index() {
  const bookId = Route.useParams().bookId;
  const navigate = useNavigate();

  const [htmlString, setHtmlString] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [chapters, setChapters] = useState<ChaptersRecord[]>([]);

  const { data: lastReadBook } = useGetLastReadBook();
  const { data: book } = useGetBookById(bookId && bookId !== "undefined" ? bookId : lastReadBook?.book || "");
  const { data: chapter } = useGetChapterById(chapterId);

  useEffect(() => {
    if (book?.current_chapter) {
      setChapterId(book.current_chapter);
    } else if (book && book.chapters) {
      setChapterId(book.chapters[0]);
    }

    if (book) {
      setChapters(book.expand.chapters);
    }
  }, [book]);

  useEffect(() => {
    if (chapter) {
      setHtmlString(chapter.content || "<p>Loading...</p>");
    }
  }, [chapter]);

  useEffect(() => {
    if ((!bookId || bookId === "undefined") && lastReadBook?.book) {
      navigate({ to: "/reader/$bookId", params: { bookId: lastReadBook.book } });
    }
  }, [bookId, lastReadBook?.book, navigate]);

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
              {chapters.map((chapter) => (
                <li
                  key={chapter.id}
                  onClick={() => {
                    setChapterId(chapter.id);
                  }}
                  className={`cursor-pointer p-2 rounded hover:bg-accent ${
                    chapter.id === chapterId ? "bg-accent" : ""
                  }`}
                >
                  {chapter.title}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <PlateController>
        <PlateEditor htmlString={htmlString} />
      </PlateController>
    </div>
  );
}

function PlateEditor({ htmlString = "" }) {
  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });

  // const selection = useEditorSelection();
  // useEffect(() => {
  //   console.log(editor.api.string());
  // }, [editor.api, selection]);

  useEffect(() => {
    if (!editor || !htmlString) return;
    const slateValue = editor.api.html.deserialize({ element: htmlString });
    // @ts-expect-error ignore
    editor.tf.setValue(slateValue);
  }, [editor, htmlString]);

  return (
    <Plate editor={editor}>
      <EditorContainer className="h-full w-full max-h-[calc(100vh-50px)] overflow-hidden caret-transparent">
        <Editor />
      </EditorContainer>
    </Plate>
  );
}
