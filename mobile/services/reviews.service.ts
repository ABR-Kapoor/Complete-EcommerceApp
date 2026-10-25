import api from './api';
import { supabaseApi } from './supabase';
import { Review } from '../types';

export const reviewsService = {
  async getProductReviews(productId: number): Promise<Review[]> {
    // 1. Direct Supabase Query (ultra-fast ~100ms)
    try {
      const { data } = await supabaseApi.get('/reviews', {
        params: {
          product_id: 'eq.' + productId,
          order: 'created_at.desc',
        },
      });
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }

    // 2. Try Backend API with fast 2s timeout
    try {
      const { data } = await api.get(`/api/reviews/product/${productId}`, { timeout: 2000 });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getUserReviews(userId: string): Promise<Review[]> {
    // 1. Direct Supabase Query
    try {
      const { data } = await supabaseApi.get('/reviews', {
        params: {
          user_id: 'eq.' + userId,
          order: 'created_at.desc',
        },
      });
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }

    // 2. Try Backend API with fast 2s timeout
    try {
      const { data } = await api.get(`/api/reviews/user/${userId}`, { timeout: 2000 });
      return Array.isArray(data) ? data : [];
    } catch (e) {
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
