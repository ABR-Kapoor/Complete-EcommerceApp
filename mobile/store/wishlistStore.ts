import { create } from 'zustand';
import { wishlistService } from '../services/wishlist.service';

interface WishlistState {
  productIds: number[];
  loading: boolean;

  fetchWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (userId: string, productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  clearLocal: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: [],
  loading: false,

  fetchWishlist: async (userId) => {
    set({ loading: true });
    try {
      const ids = await wishlistService.getWishlist(userId);
      set({ productIds: ids, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  toggleWishlist: async (userId, productId) => {
    const current = get().productIds;
    const isIn = current.includes(productId);

    // Optimistic update
    if (isIn) {
      set({ productIds: current.filter((id) => id !== productId) });
      try {
        await wishlistService.removeFromWishlist(userId, productId);
      } catch {
        set({ productIds: current });
      }
    } else {
      set({ productIds: [...current, productId] });
      try {
        await wishlistService.addToWishlist(userId, productId);
      } catch {
        set({ productIds: current });
      }
    }
  },

  isInWishlist: (productId) => get().productIds.includes(productId),

  clearLocal: () => set({ productIds: [], loading: false }),
}));
