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
import { Node } from "platejs";
import { useCitationStore } from "@/lib/stores/citation-store";

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

  useEffect(() => {
    if (search.chapter) {
      setChapterId(search.chapter);
    } else if (book?.current_chapter) {
      setChapterId(book.current_chapter);
      navigate({
        to: "/reader/$bookId",
        params: { bookId },
        search: { chapter: book.current_chapter },
        replace: true,
      });
    } else if (book && book.chapters) {
      setChapterId(book.chapters[0]);
      navigate({
        to: "/reader/$bookId",
        params: { bookId },
        search: { chapter: book.chapters[0] },
        replace: true,
      });
    }

    if (book) {
      setChapters(book.expand.chapters);
    }
  }, [book, search.chapter, bookId, navigate]);

  useEffect(() => {
    if (chapter) {
      setHtmlString(chapter.content || "<p>Loading...</p>");
    }
  }, [chapter]);

  useEffect(() => {
    if ((!bookId || bookId === "undefined") && lastReadBook?.book) {
      navigate({
        to: "/reader/$bookId",
        params: { bookId: lastReadBook.book },
        search: { chapter: undefined },
      });
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
              {chapters?.map((chapter) => (
                <li
                  key={chapter.id}
                  onClick={() => {
                    setChapterId(chapter.id);
                    navigate({
                      to: "/reader/$bookId",
                      params: { bookId },
                      search: { chapter: chapter.id },
                    });
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
        <PlateEditor htmlString={htmlString} navigate={navigate} bookId={bookId} chapterId={chapterId} />
      </PlateController>
    </div>
  );
}

function PlateEditor({
  htmlString = "",
  navigate,
  bookId,
  chapterId,
}: {
  htmlString?: string;
  navigate: ReturnType<typeof useNavigate>;
  bookId: string;
  chapterId: string;
}) {
  const editor = usePlateEditor({
    plugins: [...BasicBlocksKit, ...BasicMarksKit, DisableTextInput, ...FloatingToolbarKit],
  });
  const { currentCitation, setCurrentCitation } = useCitationStore();

  const normalizeText = (text: string): string => {
    return (
      text
        .toLowerCase()
        // .replace(/[^\w\s]/g, "") // Remove punctuation
        .replace(/;/g, ".") // Replace semicolons with periods
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
    );
  };

  useEffect(() => {
    if (!editor || !htmlString) return;
    const slateValue = editor.api.html.deserialize({ element: htmlString });
    // @ts-expect-error ignore
    editor.tf.setValue(slateValue);
  }, [editor, htmlString]);

  useEffect(() => {
    if (!editor || !currentCitation) return;
    const node: Node = editor.children[parseInt(currentCitation.index)];
    // console.log("Current citation node:", node);
    // console.log("citation", currentCitation);

    const elementId = node?.id;
    const element = document.querySelector(`[data-block-id="${elementId}"]`);
    // console.log("Element found:", element);
    if (element) {
      const existingHighlights = document.querySelectorAll(".highlighted-text");
      existingHighlights.forEach((highlight) => {
        const parent = highlight.parentNode;
        parent?.replaceChild(document.createTextNode(highlight.textContent || ""), highlight);
        parent?.normalize();
      });

      // Combine all text spans into one
      const textSpans = element.querySelectorAll('[data-slate-node="text"]') as NodeListOf<HTMLElement>;
      // console.log("Text spans found:", textSpans);
      if (textSpans.length > 1) {
        // Multiple spans - combine them
        const combinedText = Array.from(textSpans)
          .map((span) => span.textContent || "")
          .join("");

        // console.log("Combined text:", combinedText);

        // Create a single span with the same nested structure
        const outerSpan = document.createElement("span");
        outerSpan.setAttribute("data-slate-node", "text");

        const leafSpan = document.createElement("span");
        leafSpan.setAttribute("data-slate-leaf", "true");

        const stringSpan = document.createElement("span");
        stringSpan.setAttribute("data-slate-string", "true");
        stringSpan.textContent = combinedText;

        leafSpan.appendChild(stringSpan);
        outerSpan.appendChild(leafSpan);

        // Get the parent element and replace all text spans
        const parentElement = textSpans[0].parentElement;

        // Remove all existing text spans
        textSpans.forEach((span) => {
          if (span.parentElement) {
            span.parentElement.removeChild(span);
          }
        });

        // Add the combined span
        if (parentElement) {
          parentElement.appendChild(outerSpan);
        }

        const normalizedSnippet = normalizeText(currentCitation.text_snippet);
        const normalizedTextContent = normalizeText(combinedText);

        // console.log("Normalized text content:", normalizedTextContent);
        // console.log("Normalized snippet:", normalizedSnippet);
        if (normalizedTextContent.includes(normalizedSnippet)) {
          const startIndex = normalizedTextContent.indexOf(normalizedSnippet);
          // console.log("Start index:", startIndex);

          if (startIndex !== -1) {
            const beforeText = combinedText.substring(0, startIndex);
            const highlightText =
              combinedText.substring(startIndex, startIndex + currentCitation.text_snippet.length) ||
              currentCitation.text_snippet;
            const afterText = combinedText.substring(startIndex + currentCitation.text_snippet.length);

            stringSpan.innerHTML = "";

            if (beforeText) {
              stringSpan.appendChild(document.createTextNode(beforeText));
            }

            const highlightSpan = document.createElement("span");
            highlightSpan.className = "highlighted-text bg-yellow-200 text-yellow-900";
            highlightSpan.textContent = highlightText;
            stringSpan.appendChild(highlightSpan);

            if (afterText) {
              stringSpan.appendChild(document.createTextNode(afterText));
            }

            element.scrollIntoView({ behavior: "smooth", block: "center" });

            const timeout = setTimeout(() => {
              setCurrentCitation(undefined);
              const currentHighlights = document.querySelectorAll(".highlighted-text");
              currentHighlights.forEach((highlight) => {
                const parent = highlight.parentNode;
                parent?.replaceChild(document.createTextNode(highlight.textContent || ""), highlight);
                parent?.normalize();
              });
            }, 5000);

            return () => clearTimeout(timeout);
          }
        }
      } else if (textSpans.length === 1) {
        // Single span - use existing logic
        const textSpan = textSpans[0].querySelector('[data-slate-string="true"]') as HTMLElement;
        const normalizedSnippet = normalizeText(currentCitation.text_snippet);
        const normalizedTextContent = normalizeText(textSpan?.textContent || "");

        if (textSpan && normalizedTextContent.includes(normalizedSnippet)) {
          const textContent = textSpan.textContent;
          const startIndex = normalizedTextContent.indexOf(normalizedSnippet);

          if (startIndex !== -1) {
            const beforeText = textContent?.substring(0, startIndex);
            const highlightText =
              textContent?.substring(startIndex, startIndex + currentCitation.text_snippet.length) ||
              currentCitation.text_snippet;
            const afterText = textContent?.substring(startIndex + currentCitation.text_snippet.length);

            textSpan.innerHTML = "";

            if (beforeText) {
              textSpan.appendChild(document.createTextNode(beforeText));
            }

            const highlightSpan = document.createElement("span");
            highlightSpan.className = "highlighted-text bg-yellow-200 text-yellow-900";
            highlightSpan.textContent = highlightText;
            textSpan.appendChild(highlightSpan);

            if (afterText) {
              textSpan.appendChild(document.createTextNode(afterText));
            }

            element.scrollIntoView({ behavior: "smooth", block: "center" });

            const timeout = setTimeout(() => {
              setCurrentCitation(undefined);
              const currentHighlights = document.querySelectorAll(".highlighted-text");
              currentHighlights.forEach((highlight) => {
                const parent = highlight.parentNode;
                parent?.replaceChild(document.createTextNode(highlight.textContent || ""), highlight);
                parent?.normalize();
              });
            }, 5000);

            return () => clearTimeout(timeout);
          }
        }
      }
    }
  }, [editor, htmlString, navigate, bookId, chapterId, currentCitation, setCurrentCitation]);

  return (
    <Plate editor={editor}>
      <EditorContainer className="h-full w-full max-h-[calc(100vh-50px)] overflow-hidden caret-transparent">
        <Editor />
      </EditorContainer>
    </Plate>
  );
}
