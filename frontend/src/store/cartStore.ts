import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  title: string;
  price: number;
  image_url: string;
}

interface CartStore {
  items: CartItem[];
  fetchCart: (userId: string) => Promise<void>;
  addItem: (item: CartItem, userId?: string) => Promise<void>;
  removeItem: (id: number, userId?: string) => Promise<void>;
  removeByProductIds: (productIds: number[]) => void;
  updateQuantity: (id: number, quantity: number, userId?: string) => Promise<void>;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      fetchCart: async (userId) => {
        try {
          const res = await api.get(`/api/cart/${userId}`);
          // Map DB structure to store structure
          const formatted = res.data.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            title: item.products.title,
            price: item.products.price,
            image_url: item.products.image_url,
          }));
          set({ items: formatted });
        } catch (e) {
          console.error("Fetch cart failed", e);
        }
      },
      addItem: async (item, userId) => {
        const { items } = get();
        const exists = items.find((i) => i.product_id === item.product_id);
        
        if (exists) {
          await get().updateQuantity(exists.id, exists.quantity + item.quantity, userId);
          return;
        }

        set({ items: [...items, item] });

        if (userId) {
          console.log(`Syncing cart for user ${userId}...`);
          try {
            const res = await api.post(`/api/cart/${userId}/add`, {
              product_id: item.product_id,
              quantity: item.quantity
            });
            console.log("Cart sync response:", res.data);
            await get().fetchCart(userId); // Refresh to get the DB ID
          } catch (e) {
            console.error("Cart sync failed", e);
          }
        } else {
          console.warn("No userId provided, cart sync skipped.");
        }
      },
      removeItem: async (id, userId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
        if (userId) {
          try {
            await api.delete(`/api/cart/${userId}/remove/${id}`);
          } catch (e) {
            console.error("Cart item removal failed", e);
          }
        }
      },
      removeByProductIds: (productIds) =>
        set((state) => ({
          items: state.items.filter((i) => !productIds.includes(i.product_id)),
        })),
      updateQuantity: async (id, quantity, userId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
        if (userId) {
          try {
            await api.put(`/api/cart/${userId}/update/${id}?quantity=${quantity}`);
          } catch (e) {
            console.error("Cart update failed", e);
          }
        }
      },
      clear: () => set({ items: [] }),
      total: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    { name: "cart_store" }
  )
);
