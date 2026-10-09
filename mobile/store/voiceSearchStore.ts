import { create } from 'zustand';

interface VoiceSearchState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useVoiceSearchStore = create<VoiceSearchState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
