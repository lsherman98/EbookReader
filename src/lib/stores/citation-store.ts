import { create } from 'zustand';
import { Citation } from '@/lib/api/mutations';

interface CitationStore {
    currentCitation: Citation | undefined;
    setCurrentCitation: (citation: Citation | undefined) => void;
}

export const useCitationStore = create<CitationStore>((set) => ({
    currentCitation: undefined,
    setCurrentCitation: (citation) => set({ currentCitation: citation }),
}));
