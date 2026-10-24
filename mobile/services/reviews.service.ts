import api from './api';
import { Review } from '../types';

export const reviewsService = {
  async getProductReviews(productId: number): Promise<Review[]> {
    const { data } = await api.get(`/api/reviews/product/${productId}`);
    return data;
  },

  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const { data } = await api.get(`/api/reviews/user/${userId}`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.log('Error fetching user reviews:', e);
      return [];
    }
  },

  async createReview(
    userId: string,
    review: { product_id: number; rating: number; text: string; order_id?: number }
  ) {
    const { data } = await api.post('/api/reviews/', review, {
      params: { user_id: userId },
    });
    return data;
  },

  async updateReview(
    reviewId: number,
    review: { product_id: number; rating: number; text: string }
  ) {
    const { data } = await api.put(`/api/reviews/${reviewId}`, review);
    return data;
  },

  async deleteReview(reviewId: number) {
    const { data } = await api.delete(`/api/reviews/${reviewId}`);
    return data;
  },
};
