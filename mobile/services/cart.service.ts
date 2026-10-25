import api from './api';
import { supabaseApi } from './supabase';
import { CartItem } from '../types';

export const cartService = {
  /**
   * Fetch all cart items for a user.
   * Tries backend first; falls back to direct Supabase REST API.
   */
  async getCart(userId: string): Promise<CartItem[]> {
    if (!userId || userId === 'guest') {
      return [];
    }

    // 1. Try Backend API
    try {
      const { data } = await api.get(`/api/cart/${userId}`);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (backendErr: any) {
      if (__DEV__) console.log('[CartService] Backend getCart failed, trying Supabase direct:', backendErr.message);
    }

    // 2. Direct Supabase Fallback
    try {
      const { data: carts } = await supabaseApi.get('/carts', {
        params: { user_id: `eq.${userId}`, select: 'id' },
      });

      if (!carts || carts.length === 0) {
        return [];
      }

      const cartId = carts[0].id;
      const { data: items } = await supabaseApi.get('/cart_items', {
        params: {
          cart_id: `eq.${cartId}`,
          select: '*,products(title,price,image_url)',
          order: 'id.desc',
        },
      });

      return Array.isArray(items) ? items : [];
    } catch (supabaseErr: any) {
      if (__DEV__) console.warn('[CartService] Supabase getCart failed:', supabaseErr.message);
      return [];
    }
  },

  /**
   * Add a product to the user's cart.
   * Tries backend first; falls back to direct Supabase REST API.
   */
  async addToCart(
    userId: string,
    productId: number,
    quantity: number = 1
  ): Promise<{ cart_id?: number; item_id?: number } | null> {
    if (!userId || userId === 'guest') {
      return null;
    }

    // 1. Try Backend API
    try {
      const { data } = await api.post(`/api/cart/${userId}/add`, {
        product_id: productId,
        quantity,
      });
      if (data && !data.error) {
        return data;
      }
    } catch (backendErr: any) {
      if (__DEV__) console.log('[CartService] Backend addToCart failed, trying Supabase direct:', backendErr.message);
    }

    // 2. Direct Supabase Fallback
    try {
      // Step A: Ensure user handshake in Supabase users table
      try {
        await supabaseApi.post('/users', { id: userId, name: 'Authentic User' });
      } catch {}

      // Step B: Get or create cart
      let cartId: number;
      const { data: carts } = await supabaseApi.get('/carts', {
        params: { user_id: `eq.${userId}`, select: 'id' },
      });

      if (!carts || carts.length === 0) {
        const { data: newCart } = await supabaseApi.post('/carts', { user_id: userId });
        cartId = newCart[0]?.id;
      } else {
        cartId = carts[0].id;
      }

      if (!cartId) throw new Error('Failed to obtain cart id');

      // Step C: Check if item already exists in cart
      const { data: existing } = await supabaseApi.get('/cart_items', {
        params: {
          cart_id: `eq.${cartId}`,
          product_id: `eq.${productId}`,
          select: 'id,quantity',
        },
      });

      let itemId: number;
      if (existing && existing.length > 0) {
        const newQty = (existing[0].quantity || 0) + quantity;
        const { data: updated } = await supabaseApi.patch(`/cart_items?id=eq.${existing[0].id}`, {
          quantity: newQty,
        });
        itemId = updated?.[0]?.id || existing[0].id;
      } else {
        const { data: inserted } = await supabaseApi.post('/cart_items', {
          cart_id: cartId,
          product_id: productId,
          quantity,
        });
        itemId = inserted?.[0]?.id;
      }

      return { cart_id: cartId, item_id: itemId };
    } catch (supabaseErr: any) {
      if (__DEV__) console.warn('[CartService] Supabase addToCart failed:', supabaseErr.message);
      return null;
    }
  },

  /**
   * Update quantity of a cart item.
   */
  async updateQuantity(userId: string, cartItemId: number, quantity: number) {
    if (!userId || userId === 'guest') return;

    try {
      await api.put(`/api/cart/${userId}/update/${cartItemId}`, null, {
        params: { quantity },
      });
      return;
    } catch {
      // Fallback to Supabase
    }

    try {
      if (quantity <= 0) {
        await supabaseApi.delete(`/cart_items?id=eq.${cartItemId}`);
      } else {
        await supabaseApi.patch(`/cart_items?id=eq.${cartItemId}`, { quantity });
      }
    } catch (e: any) {
      if (__DEV__) console.warn('[CartService] Supabase updateQuantity failed:', e.message);
    }
  },

  /**
   * Remove an item from the cart.
   */
  async removeItem(userId: string, cartItemId: number) {
    if (!userId || userId === 'guest') return;

    try {
      await api.delete(`/api/cart/${userId}/remove/${cartItemId}`);
      return;
    } catch {
      // Fallback to Supabase
    }

    try {
      await supabaseApi.delete(`/cart_items?id=eq.${cartItemId}`);
    } catch (e: any) {
      if (__DEV__) console.warn('[CartService] Supabase removeItem failed:', e.message);
    }
  },

  /**
   * Clear all items in the cart.
   */
  async clearCart(userId: string) {
    if (!userId || userId === 'guest') return;

    try {
      await api.delete(`/api/cart/${userId}/clear`);
    } catch {
      // Fallback to Supabase
    }

    try {
      const { data: carts } = await supabaseApi.get('/carts', {
        params: { user_id: `eq.${userId}`, select: 'id' },
      });
      if (carts && carts.length > 0) {
        await supabaseApi.delete(`/cart_items?cart_id=eq.${carts[0].id}`);
      }
    } catch (e: any) {
      if (__DEV__) console.warn('[CartService] Supabase clearCart failed:', e.message);
    }
  },
};
