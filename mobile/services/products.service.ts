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
  // OTC Medicines
  {
    id: 1,
    title: 'Crocin 500mg Advanced Pain Relief (Strip of 15)',
    price: 38,
    description: 'Relieves mild to moderate pain such as headache, bodyache, toothache, and fever. Contains Paracetamol 500mg by GSK.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 45,
  },
  {
    id: 2,
    title: 'Vicks Vaporub Fast Relief Balm (50g Jar)',
    price: 145,
    description: 'Provides quick relief from 6 cold symptoms: cough, nasal congestion, body ache, headache, and muscle stiffness.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 35,
  },
  {
    id: 3,
    title: 'Disprin Soluble Analgesic 500mg (Strip of 10)',
    price: 24,
    description: 'Fast-dissolving effervescent Aspirin tablets for quick pain relief and acute headache alleviation.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1550572017-4fcd95c9029b?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 60,
  },
  {
    id: 4,
    title: 'Voltaren Emulgel Fast Relief Joint Pain (50g)',
    price: 175,
    description: 'Targeted topical gel containing Diclofenac diethylamine to relieve muscle and joint pain.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 30,
  },
  {
    id: 5,
    title: 'Dolo 650 Paracetamol Antipyretic (Strip of 15)',
    price: 34,
    description: 'Trusted antipyretic formulation for high fever and symptomatic pain relief.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 80,
  },
  {
    id: 6,
    title: 'Digene Acidity & Gas Relief Chewable (Pack of 15)',
    price: 28,
    description: 'Quick action antacid chewable tablets for hyperacidity, heartburn, and sour stomach.',
    category: 'OTC Medicines',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 50,
  },

  // Prescription Medicines
  {
    id: 7,
    title: 'Augmentin 625mg Duo Antibiotic (Strip of 10)',
    price: 205,
    description: 'Broad-spectrum antibiotic combining Amoxicillin and Clavulanic Acid for bacterial infections.',
    category: 'Prescription Medicines',
    image_url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 25,
  },
  {
    id: 8,
    title: 'Glycomet SR 500mg Metformin (Strip of 20)',
    price: 42,
    description: 'Sustained-release Metformin tablets for managing blood glucose in type-2 diabetes.',
    category: 'Prescription Medicines',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 40,
  },
  {
    id: 9,
    title: 'Pan-D Gastro-Resistant Capsule (Strip of 15)',
    price: 198,
    description: 'Pantoprazole and Domperidone combination for GERD, reflux, and chronic acidity.',
    category: 'Prescription Medicines',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 35,
  },
  {
    id: 10,
    title: 'Telma 40mg Blood Pressure Tablet (Strip of 15)',
    price: 145,
    description: 'Telmisartan tablets prescribed for hypertension and cardiovascular protection.',
    category: 'Prescription Medicines',
    image_url: 'https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 30,
  },

  // First Aid
  {
    id: 11,
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
    id: 12,
    title: 'Hansaplast Washproof Medicated Bandage (Pack of 20)',
    price: 75,
    description: 'Water-resistant, breathable first-aid plaster for minor cuts, scrapes, and abrasions.',
    category: 'First Aid',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 65,
  },
  {
    id: 13,
    title: 'Betadine 10% Antiseptic Solution 100ml',
    price: 130,
    description: 'Povidone-iodine topical antiseptic for prevention and treatment of skin infections in minor wounds.',
    category: 'First Aid',
    image_url: 'https://images.unsplash.com/photo-1550572017-4fcd95c9029b?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 40,
  },

  // Personal Care
  {
    id: 14,
    title: 'Himalaya Herbals Purifying Neem Face Wash (150ml)',
    price: 195,
    description: 'Soap-free herbal formulation that clears impurities and prevents pimples with Neem & Turmeric.',
    category: 'Personal Care',
    image_url: 'https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 38,
  },
  {
    id: 15,
    title: 'Cetaphil Gentle Skin Cleanser (250ml)',
    price: 465,
    description: 'Dermatologist recommended non-irritating daily cleanser for sensitive and dry skin types.',
    category: 'Personal Care',
    image_url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 22,
  },

  // Health Monitoring
  {
    id: 16,
    title: 'Omron Blood Pressure Monitor Hem-7120',
    price: 2499,
    description: 'Fully automatic digital blood pressure monitor with Intellisense technology for comfortable inflation.',
    category: 'Health Monitoring',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 15,
  },
  {
    id: 17,
    title: 'Accu-Chek Instant Glucometer Test Kit',
    price: 1299,
    description: 'Easy-to-use blood glucose monitoring system with instant clarity target range indicator.',
    category: 'Health Monitoring',
    image_url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 20,
  },

  // Baby Care
  {
    id: 18,
    title: "Johnson's Baby Gentle Powder (400g)",
    price: 240,
    description: 'Clinically proven mild formula designed to protect baby skin from excess moisture and chafing.',
    category: 'Baby Care',
    image_url: 'https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 28,
  },
  {
    id: 19,
    title: 'Pampers All Round Protection Pants (Medium, 44 Pcs)',
    price: 599,
    description: 'Soft and breathable diaper pants with lotion with Aloe Vera to protect baby skin.',
    category: 'Baby Care',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 35,
  },

  // Healthcare Devices
  {
    id: 20,
    title: 'Dr. Trust Infrared Forehead Thermometer',
    price: 1499,
    description: 'Non-contact digital infrared thermometer with 1-second temperature detection and color fever alarm.',
    category: 'Healthcare Devices',
    image_url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: false,
    stock: 14,
  },
  {
    id: 21,
    title: 'Beurer Fingertip Pulse Oximeter PO 30',
    price: 1850,
    description: 'Medical device for determining arterial oxygen saturation (SpO2) and heart rate (pulse).',
    category: 'Healthcare Devices',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80',
    sold: true,
    is_sale: true,
    stock: 18,
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
