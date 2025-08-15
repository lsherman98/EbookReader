import { useDeleteHighlight } from "@/lib/api/mutations";
import { useGetHighlights } from "@/lib/api/queries";
import { useCurrentChapterStore } from "@/lib/stores/current-chapter-store";
import { useState } from "react";
import { SidebarGroup } from "../ui/sidebar";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Trash2, BookOpen, FileText, Calendar } from "lucide-react";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { HighlightsRecord } from "@/lib/pocketbase-types";
import { useSelectedHighlightStore } from "@/lib/stores/selected-highlight-store";
import { formatHighlightDate } from "@/lib/utils";
import { ExpandHighlights } from "@/lib/types";

export function SidebarHighlights({ bookId }: { bookId: string }) {
  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const { setSelectedHighlight } = useSelectedHighlightStore();

  const { currentChapterId } = useCurrentChapterStore();
  const { data: highlights } = useGetHighlights(bookId, showAllHighlights ? undefined : currentChapterId);
  const deleteHighlightMutation = useDeleteHighlight();

  if (!highlights) return null;

  const handleHighlightClick = (highlight: HighlightsRecord) => {
    setSelectedHighlight(highlight);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-sidebar-background/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar-background/60">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sidebar-foreground">Highlights</h3>
            <Badge variant="secondary" className="text-xs">
              {highlights.length}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-all" className="text-sm text-sidebar-foreground whitespace-nowrap">
                Show All
              </Label>
              <Switch id="show-all" checked={showAllHighlights} onCheckedChange={setShowAllHighlights} />
            </div>
          </div>
        </div>
      </div>
      <SidebarGroup className="px-0 flex-1 overflow-hidden">
        <div className="p-2 space-y-2 overflow-auto">
          {highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
          ) : (
            highlights.map((highlight) => {
              return (
                <Card
                  key={highlight.id}
                  className="group cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleHighlightClick(highlight)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p
                          className="text-sm leading-relaxed overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          "{highlight.text}"
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          <span className="truncate font-medium">
                            {(highlight.expand as ExpandHighlights)?.book?.title || "Unknown Book"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{(highlight.expand as ExpandHighlights).chapter.title}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatHighlightDate(highlight.created || "")}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHighlightMutation.mutate({ highlightId: highlight.id });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete highlight</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </SidebarGroup>
    </div>
  );
}
