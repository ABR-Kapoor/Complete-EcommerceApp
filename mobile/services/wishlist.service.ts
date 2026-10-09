import api from './api';

export const wishlistService = {
  async getWishlist(userId: string): Promise<number[]> {
    const { data } = await api.get(`/api/wishlist/${userId}`);
    return data;
  },

  async addToWishlist(userId: string, productId: number) {
    const { data } = await api.post(`/api/wishlist/${userId}/${productId}`);
    return data;
  },

  async removeFromWishlist(userId: string, productId: number) {
    const { data } = await api.delete(`/api/wishlist/${userId}/${productId}`);
    return data;
  },
};
