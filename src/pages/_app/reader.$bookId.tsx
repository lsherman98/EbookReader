import { createFileRoute } from "@tanstack/react-router";
import { useGetBookById, useGetChapterById } from "@/lib/api/queries";
import { Plate, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/reader/$bookId")({
  component: Index,
});

function Index() {
  const bookId = Route.useParams().bookId;

  const [htmlString, setHtmlString] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");

  const { data: book } = useGetBookById(bookId);
  const { data: chapter, refetch: refetchChapter } = useGetChapterById(chapterId);

  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit],
  });

  useEffect(() => {
    if (book && book.chapters && book.chapters.length > 0) {
      setChapterId(book.chapters[0]);
    }
  }, [book, refetchChapter]);

  useEffect(() => {
    if (chapter) {
      setHtmlString(chapter.content || "<p>Loading...</p>");
    }
  }, [chapter]);

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
