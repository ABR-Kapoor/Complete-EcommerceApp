import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  items: number[];
  toggle: (productId: number) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>(
  persist(
    (set) => ({
      items: [],
      toggle: (productId) =>
        set((state) => ({
          items: state.items.includes(productId)
            ? state.items.filter((id) => id !== productId)
            : [...state.items, productId],
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "wishlist_store" }
  )
);
