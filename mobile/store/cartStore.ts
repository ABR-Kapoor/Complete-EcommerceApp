import { create } from 'zustand';
import { CartItem } from '../types';
import { cartService } from '../services/cart.service';

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;

  fetchCart: (userId: string) => Promise<void>;
  addToCart: (userId: string, productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (userId: string, cartItemId: number, quantity: number) => Promise<void>;
  removeItem: (userId: string, cartItemId: number) => Promise<void>;
  clearLocal: () => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchCart: async (userId) => {
    set({ loading: true, error: null });
    try {
      const items = await cartService.getCart(userId);
      set({ items, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addToCart: async (userId, productId, quantity = 1) => {
    try {
      await cartService.addToCart(userId, productId, quantity);
      await get().fetchCart(userId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateQuantity: async (userId, cartItemId, quantity) => {
    // Optimistic update
    const prevItems = get().items;
    set({
      items: prevItems.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item
      ),
    });
    try {
      await cartService.updateQuantity(userId, cartItemId, quantity);
      await get().fetchCart(userId);
    } catch (err: any) {
      set({ items: prevItems, error: err.message });
    }
  },

  removeItem: async (userId, cartItemId) => {
    const prevItems = get().items;
    set({ items: prevItems.filter((item) => item.id !== cartItemId) });
    try {
      await cartService.removeItem(userId, cartItemId);
    } catch (err: any) {
      set({ items: prevItems, error: err.message });
    }
  },

  clearLocal: () => set({ items: [], loading: false, error: null }),

  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  subtotal: () =>
    get().items.reduce(
      (sum, item) => sum + item.products.price * item.quantity,
      0
    ),
}));
