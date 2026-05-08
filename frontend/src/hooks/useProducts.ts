import { useEffect, useState } from "react";
import api from "../lib/api";

import type { Product } from "../types/product";

export const useProducts = (category?: string, minPrice?: number, maxPrice?: number, search?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams();
        if (category) params.append("category", category);
        if (minPrice !== undefined) params.append("min_price", minPrice.toString());
        if (maxPrice !== undefined) params.append("max_price", maxPrice.toString());
        if (search) params.append("search", search);

        const response = await api.get(`/api/products?${params}`);
        const data = Array.isArray(response.data) ? response.data : response.data.data || [];
        setProducts(data);
        setError(null);
      } catch (err: any) {
        console.error("Products fetch error:", err);
        setError(err.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    const interval = setInterval(fetchProducts, 30000); // Real-time sync every 30s
    return () => clearInterval(interval);
  }, [category, minPrice, maxPrice, search]);

  return { products, loading, error };
};

export const useProduct = (id: number) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/api/products/${id}`);
        setProduct(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    const interval = setInterval(fetchProduct, 10000); // Sync every 10s for details
    return () => clearInterval(interval);
  }, [id]);

  return { product, loading, error };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/api/products/categories");
        setCategories(response.data.map((c: any) => c.name));
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading };
};
