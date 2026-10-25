import { create } from 'zustand';
import { CartItem, Product } from '../types';
import { cartService } from '../services/cart.service';
import { cartStorage } from '../services/cartStorage';
import { productsService } from '../services/products.service';

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  initCart: () => Promise<void>;
  fetchCart: (userId?: string | null) => Promise<void>;
  addToCart: (
    userId?: string | null,
    productId?: number,
    quantity?: number,
    productData?: Partial<Product>
  ) => Promise<void>;
  updateQuantity: (
    userId: string | undefined | null,
    cartItemId: number,
    quantity: number
  ) => Promise<void>;
  removeItem: (userId: string | undefined | null, cartItemId: number) => Promise<void>;
  clearCart: (userId?: string | null) => Promise<void>;
  clearLocal: () => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  initialized: false,

  initCart: async () => {
    try {
      const localItems = await cartStorage.getLocalCart();
      if (Array.isArray(localItems) && localItems.length > 0) {
        set({ items: localItems, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  fetchCart: async (userId) => {
    if (!get().initialized) {
      await get().initCart();
    }

    if (!userId || userId === 'guest') {
      return;
    }

    set({ loading: get().items.length === 0, error: null });
    try {
      const serverItems = await cartService.getCart(userId);
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        set({ items: serverItems, loading: false });
        await cartStorage.saveLocalCart(serverItems);
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addToCart: async (userId, productId, quantity = 1, productData) => {
    if (!productId) return;

    // 1. Resolve product details (from argument or service lookup)
    let title = productData?.title;
    let price = productData?.price;
    let image_url = productData?.image_url;

    if (!title || price === undefined) {
      try {
        const prod = await productsService.getById(productId);
        if (prod) {
          title = prod.title;
          price = prod.price;
          image_url = prod.image_url;
        }
      } catch {}
    }

    // Exact numerical price resolution
    const finalPrice = Number(productData?.price ?? price ?? 0);
    title = title || 'Healthcare Product';
    image_url =
      image_url ||
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80';

    // 2. Immediate optimistic update
    const prevItems = get().items;
    const existingIndex = prevItems.findIndex((it) => it.product_id === productId);

    let nextItems: CartItem[];
    let targetCartItemId: number;

    if (existingIndex >= 0) {
      const existing = prevItems[existingIndex];
      targetCartItemId = existing.id;
      const existingPrice = Number(existing.products?.price ?? (existing as any).price ?? finalPrice);
      const updatedItem: CartItem = {
        ...existing,
        quantity: existing.quantity + quantity,
        products: {
          title: title || existing.products?.title || 'Healthcare Product',
          price: existingPrice > 0 ? existingPrice : finalPrice,
          image_url: image_url || existing.products?.image_url || '',
        },
      };
      nextItems = [...prevItems];
      nextItems[existingIndex] = updatedItem;
    } else {
      targetCartItemId = Date.now();
      const newItem: CartItem = {
        id: targetCartItemId,
        cart_id: 0,
        product_id: productId,
        quantity,
        products: {
          title,
          price: finalPrice,
          image_url,
        },
      };
      nextItems = [newItem, ...prevItems];
    }

    set({ items: nextItems, error: null });
    await cartStorage.saveLocalCart(nextItems);

    // 3. Background sync to backend/Supabase if user is signed in
    if (userId && userId !== 'guest') {
      try {
        const result = await cartService.addToCart(userId, productId, quantity);
        if (result?.item_id) {
          set((state) => {
            const updated = state.items.map((it) =>
              it.id === targetCartItemId
                ? { ...it, id: result.item_id!, cart_id: result.cart_id || it.cart_id }
                : it
            );
            cartStorage.saveLocalCart(updated);
            return { items: updated };
          });
        }
      } catch (err: any) {
        if (__DEV__) console.log('[cartStore] Cloud sync notice:', err.message);
      }
    }
  },

  updateQuantity: async (userId, cartItemId, quantity) => {
    const prevItems = get().items;
    let nextItems: CartItem[];
    if (quantity <= 0) {
      nextItems = prevItems.filter((item) => item.id !== cartItemId);
    } else {
      nextItems = prevItems.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item
      );
    }
    set({ items: nextItems });
    await cartStorage.saveLocalCart(nextItems);

    if (userId && userId !== 'guest') {
      try {
        await cartService.updateQuantity(userId, cartItemId, quantity);
      } catch (err: any) {
        if (__DEV__) console.log('[cartStore] updateQuantity cloud notice:', err.message);
      }
    }
  },

  removeItem: async (userId, cartItemId) => {
    const prevItems = get().items;
    const nextItems = prevItems.filter((item) => item.id !== cartItemId);
    set({ items: nextItems });
    await cartStorage.saveLocalCart(nextItems);

    if (userId && userId !== 'guest') {
      try {
        await cartService.removeItem(userId, cartItemId);
      } catch (err: any) {
        if (__DEV__) console.log('[cartStore] removeItem cloud notice:', err.message);
      }
    }
  },

  clearCart: async (userId) => {
    const prevItems = get().items;
    set({ items: [], loading: false, error: null });
    await cartStorage.clearLocalCart();

    if (userId && userId !== 'guest') {
      try {
        await cartService.clearCart(userId);
      } catch (err: any) {
        if (__DEV__) console.log('[cartStore] clearCart error:', err);
      }
      for (const item of prevItems) {
        try {
          await cartService.removeItem(userId, item.id);
        } catch {}
      }
    }
  },

  clearLocal: () => {
    set({ items: [], loading: false, error: null });
    cartStorage.clearLocalCart();
  },

  totalItems: () =>
    get().items.reduce((sum, item) => sum + (item.quantity || 1), 0),

  subtotal: () =>
    get().items.reduce((sum, item) => {
      const price = Number(item.products?.price ?? (item as any).price ?? 0);
      const qty = Number(item.quantity || 1);
      return sum + (isNaN(price) ? 0 : price) * qty;
    }, 0),
}));
