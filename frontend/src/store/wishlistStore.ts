import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

interface WishlistStore {
  items: number[];
  toggle: (productId: number, userId?: string) => Promise<void>;
  fetchWishlist: (userId: string) => Promise<void>;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      fetchWishlist: async (userId) => {
        try {
          const res = await api.get(`/api/wishlist/${userId}`);
          set({ items: res.data });
        } catch (e) {
          console.error("Failed to fetch wishlist", e);
        }
      },
      toggle: async (productId, userId) => {
        const { items } = get();
        const isExist = items.includes(productId);
        const newItems = isExist
          ? items.filter((id) => id !== productId)
          : [...items, productId];
        
        set({ items: newItems });

        if (userId) {
          try {
            if (isExist) {
              await api.delete(`/api/wishlist/${userId}/${productId}`);
            } else {
              await api.post(`/api/wishlist/${userId}/${productId}`);
            }
          } catch (e) {
            console.error("Wishlist sync failed", e);
          }
        }
      },
      clear: () => set({ items: [] }),
    }),
    { name: "wishlist_store" }
  )
);
