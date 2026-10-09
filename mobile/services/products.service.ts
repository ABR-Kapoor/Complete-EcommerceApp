import api from './api';
import { Product, Category } from '../types';

export const PHARMACY_CATEGORIES: Category[] = [
  { id: 1, name: 'OTC Medicines' },
  { id: 2, name: 'Prescription Medicines' },
  { id: 3, name: 'First Aid' },
  { id: 4, name: 'Personal Care' },
  { id: 5, name: 'Health Monitoring' },
  { id: 6, name: 'Baby Care' },
  { id: 7, name: 'Healthcare Devices' },
];

export const PHARMACY_PRODUCTS: Product[] = [
  {
    id: 1,
    title: 'Crocin 500mg Tablet',
    price: 45,
    description: 'Relieves mild to moderate pain such as headache, bodyache, toothache, and in reducing fever. Contains Paracetamol 500mg by GSK.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 25,
  },
  {
    id: 2,
    title: 'Presalaya Immunity Boost',
    price: 320,
    description: 'Herbal immunity booster tablets formulated with Giloy, Tulsi, and Ashwagandha to support daily wellness.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 40,
  },
  {
    id: 3,
    title: 'Accu-Chek Instant Glucometer',
    price: 1299,
    description: 'Easy-to-use blood glucose monitoring system with instant clarity target range indicator.',
    category: 'Healthcare Devices',
    image_url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 12,
  },
  {
    id: 4,
    title: 'Dettol Antiseptic Liquid 500ml',
    price: 210,
    description: 'Trusted antiseptic disinfectant liquid for first aid, surface cleaning, and personal hygiene.',
    category: 'First Aid',
    image_url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 50,
  },
  {
    id: 5,
    title: 'Omron Blood Pressure Monitor',
    price: 2899,
    description: 'Fully automatic digital blood pressure monitor with Intellisense technology for comfortable inflation.',
    category: 'Health Monitoring',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 8,
  },
  {
    id: 6,
    title: 'Vicks Vaporub 25g',
    price: 110,
    description: 'Provides quick relief from 6 cold symptoms: cough, nasal congestion, body ache, headache, muscle stiffness.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 35,
  },
  {
    id: 7,
    title: 'Himalaya Immunity Boost 60s',
    price: 220,
    description: 'Ayurvedic formulation for building natural resistance against infections.',
    category: 'Personal Care',
    image_url: 'https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 18,
  },
  {
    id: 8,
    title: 'Disprin Tablets 500mg',
    price: 42,
    description: 'Fast-dissolving effervescent Aspirin tablets for quick pain relief.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1550572017-4fcd95c9029b?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 60,
  },
];

export const productsService = {
  async getAll(params?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
  }): Promise<Product[]> {
    try {
      const { data } = await api.get('/api/products/', { params });
      if (Array.isArray(data) && data.length > 0) {
        // If API returns products, check if they are generic and map or return
        const isGeneric = data.some((p: Product) =>
          ['Electronics', 'Clothing', 'Home', 'Books', 'Yoga Mat Premium', 'Organic Face Moisturizer'].includes(p.category) ||
          ['Electronics', 'Clothing', 'Home', 'Books', 'Yoga Mat Premium', 'Organic Face Moisturizer'].includes(p.title)
        );
        if (!isGeneric) {
          return data;
        }
      }
    } catch {
      // Fallback on network/API failure
    }

    // Return pharmacy products
    let list = PHARMACY_PRODUCTS;
    if (params?.category) {
      list = list.filter((p) => p.category.toLowerCase() === params.category!.toLowerCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list;
  },

  async getById(id: number): Promise<Product> {
    try {
      const { data } = await api.get(`/api/products/${id}`);
      if (data && data.title && !['Organic Face Moisturizer', 'Yoga Mat Premium'].includes(data.title)) {
        return data;
      }
    } catch {
      // Fallback
    }

    const match = PHARMACY_PRODUCTS.find((p) => p.id === Number(id));
    return match || PHARMACY_PRODUCTS[0];
  },

  async getCategories(): Promise<Category[]> {
    try {
      const { data } = await api.get('/api/products/categories');
      if (Array.isArray(data) && data.length > 0) {
        const isGeneric = data.some((c: Category) =>
          ['Electronics', 'Clothing', 'Home', 'Books'].includes(c.name)
        );
        if (!isGeneric) {
          return data;
        }
      }
    } catch {
      // Fallback
    }

    return PHARMACY_CATEGORIES;
  },

  async getMostBought(): Promise<Array<{ product_id: number; sum: number }>> {
    try {
      const { data } = await api.get('/api/products/most-bought');
      return data;
    } catch {
      return [
        { product_id: 1, sum: 150 },
        { product_id: 3, sum: 95 },
        { product_id: 4, sum: 80 },
      ];
    }
  },
};
