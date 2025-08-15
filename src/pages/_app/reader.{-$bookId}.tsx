import { createFileRoute } from "@tanstack/react-router";
import { useGetBookById, useGetChapterById, useGetChaptersByBookId, useGetLastReadBook } from "@/lib/api/queries";
import { PlateController } from "platejs/react";
import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SquareMenu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSelectedHighlightStore } from "@/lib/stores/selected-highlight-store";
import { PlateEditor } from "@/components/editor/PlateEditor";
import { useCurrentChapterStore } from "@/lib/stores/current-chapter-store";

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
  const { chapter: chapterId } = Route.useSearch();
  const navigate = useNavigate();

  const { data: chaptersData } = useGetChaptersByBookId(bookId);
  const { data: chapter } = useGetChapterById(chapterId);
  const { data: book } = useGetBookById(bookId);
  const { selectedHighlight } = useSelectedHighlightStore();
  const { data: lastReadBook, refetch: refetchLastReadBook } = useGetLastReadBook();
  const { currentChapterId, setCurrentChapterId } = useCurrentChapterStore();

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
      if (!bookId) return;
      setCurrentChapterId(chapterId);
      navigateTo(bookId, chapterId, false);
    },
    [setCurrentChapterId, navigateTo, bookId],
  );

  useEffect(() => {
    if (!bookId || bookId === "undefined") {
      if (lastReadBook) {
        navigateTo(lastReadBook.book, lastReadBook.chapter, true);
      } else {
        refetchLastReadBook();
      }
      return;
    }

    if (chapterId) {
      setCurrentChapterId(chapterId);
    } else if (book?.current_chapter) {
      navigateTo(bookId, book.current_chapter, true);
    }
  }, [bookId, chapterId, lastReadBook, book, navigateTo, refetchLastReadBook, setCurrentChapterId]);

  useEffect(() => {
    if (selectedHighlight?.chapter && selectedHighlight.chapter !== currentChapterId) {
      handleChapterClick(selectedHighlight.chapter);
    }
  }, [selectedHighlight, currentChapterId, handleChapterClick]);

  useEffect(() => {
    return () => {
      setCurrentChapterId(undefined);
    };
  }, [setCurrentChapterId]);

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
              {chaptersData?.map((chapter) => (
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
