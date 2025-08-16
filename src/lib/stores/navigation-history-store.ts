import { create } from 'zustand';

interface NavigationLocation {
    bookId: string;
    chapterId: string;
    elementId: string | null;
}

interface NavigationHistoryStore {
    previousLocation: NavigationLocation | undefined;
    setPreviousLocation: (location: NavigationLocation | undefined) => void;
    canGoBack: () => boolean;
}

export const useNavigationHistoryStore = create<NavigationHistoryStore>((set, get) => ({
    previousLocation: undefined,
    setPreviousLocation: (location) => set({ previousLocation: location }),
    canGoBack: () => !!get().previousLocation,
}));
