import { create } from 'zustand';
import { Citation } from '../types';

interface CitationStore {
    currentCitation: Citation | undefined;
    setCurrentCitation: (citation: Citation | undefined) => void;
}

export const useCitationStore = create<CitationStore>((set) => ({
    currentCitation: undefined,
    setCurrentCitation: (citation) => set({ currentCitation: citation }),
}));
