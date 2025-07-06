import { createFileRoute } from "@tanstack/react-router";
import { useGetBookById, useGetChapterById, useGetLastReadBook } from "@/lib/api/queries";
import { Plate, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/reader/$bookId")({
  component: Index,
});

function Index() {
  const bookId = Route.useParams().bookId;
  const navigate = useNavigate();

  const [htmlString, setHtmlString] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");

  const { data: lastReadBook } = useGetLastReadBook();
  const { data: book } = useGetBookById(
    bookId && bookId !== "undefined" ? bookId : lastReadBook?.book || "",
  );
  const { data: chapter } = useGetChapterById(chapterId);

  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit],
  });

  useEffect(() => {
    if (book?.current_chapter) {
      setChapterId(book.current_chapter);
    } else if (book && book.chapters) {
      setChapterId(book.chapters[0]);
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

  useEffect(() => {
    if (!editor || !htmlString) return;
    const slateValue = editor.api.html.deserialize({ element: htmlString });
    // @ts-expect-error ignore
    editor.tf.setValue(slateValue);
  }, [editor, htmlString]);

  return (
    <>
      <div>
        <Plate editor={editor}>
          <EditorContainer>
            <Editor placeholder="Type your amazing content here..." />
          </EditorContainer>
        </Plate>
      </div>
    </>
  );
}
