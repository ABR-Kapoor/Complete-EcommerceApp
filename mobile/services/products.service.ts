import api from './api';
import { Product, Category } from '../types';

export const productsService = {
  async getAll(params?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
  }): Promise<Product[]> {
    const { data } = await api.get('/api/products/', { params });
    return data;
  },

  async getById(id: number): Promise<Product> {
    const { data } = await api.get(`/api/products/${id}`);
    return data;
  },

  async getCategories(): Promise<Category[]> {
    const { data } = await api.get('/api/products/categories');
    return data;
  },

  async getMostBought(): Promise<Array<{ product_id: number; sum: number }>> {
    const { data } = await api.get('/api/products/most-bought');
    return data;
  },
};
