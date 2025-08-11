import { create } from "zustand";
import { HighlightsRecord } from "../pocketbase-types";

interface SelectedHighlightStore {
    selectedHighlight: HighlightsRecord | undefined;
    setSelectedHighlight: (highlight: HighlightsRecord) => void;
}

export const useSelectedHighlightStore = create<SelectedHighlightStore>((set) => ({
    selectedHighlight: undefined,
    setSelectedHighlight: (highlight) => set({ selectedHighlight: highlight }),
}));
