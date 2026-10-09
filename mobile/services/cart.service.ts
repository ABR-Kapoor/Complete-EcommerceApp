import api from './api';
import { CartItem } from '../types';

export const cartService = {
  async getCart(userId: string): Promise<CartItem[]> {
    const { data } = await api.get(`/api/cart/${userId}`);
    return data;
  },

  async addToCart(userId: string, productId: number, quantity: number = 1) {
    const { data } = await api.post(`/api/cart/${userId}/add`, {
      product_id: productId,
      quantity,
    });
    return data;
  },

  async updateQuantity(userId: string, cartItemId: number, quantity: number) {
    const { data } = await api.put(
      `/api/cart/${userId}/update/${cartItemId}`,
      null,
      { params: { quantity } }
    );
    return data;
  },

  async removeItem(userId: string, cartItemId: number) {
    const { data } = await api.delete(`/api/cart/${userId}/remove/${cartItemId}`);
    return data;
  },
};
