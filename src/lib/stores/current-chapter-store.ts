import { create } from "zustand";

interface CurrentChapterStore {
    currentChapterId: string | undefined;
    setCurrentChapterId: (chapterId: string | undefined) => void;
}

export const useCurrentChapterStore = create<CurrentChapterStore>((set) => ({
    currentChapterId: undefined,
    setCurrentChapterId: (chapterId) => set({ currentChapterId: chapterId }),
}));