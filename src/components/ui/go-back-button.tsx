import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useNavigationHistoryStore } from "@/lib/stores/navigation-history-store";
import { useCitationStore } from "@/lib/stores/citation-store";
import { useSelectedHighlightStore } from "@/lib/stores/selected-highlight-store";
import { MouseEvent } from "react";

export function GoBackButton({ onClick }: { onClick: () => void }) {
  const { setPreviousLocation } = useNavigationHistoryStore();
  const { setCurrentCitation } = useCitationStore();
  const { setSelectedHighlight } = useSelectedHighlightStore();

  const handleXClick = (e: MouseEvent) => {
    e.stopPropagation();
    setPreviousLocation(undefined);
    setCurrentCitation(undefined);
    setSelectedHighlight(undefined);
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-6 py-3 bg-white text-gray-700 border border-gray-200 shadow-md hover:bg-white hover:shadow-lg transition-all duration-200 backdrop-blur-sm"
      title="Go back to previous location (Alt + ←)"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm font-medium">Return to previous location</span>
      <X className="h-4 w-4 ml-2" onClick={handleXClick} />
    </Button>
  );
}
