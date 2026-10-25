import api from './api';
import { supabaseApi } from './supabase';
import { Order, CreateOrderPayload, PaymentTransaction } from '../types';

export const ordersService = {
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const { data } = await api.get(`/api/orders/user/${userId}`);
      if (Array.isArray(data)) return data;
    } catch {
      // Fallback
    }

    try {
      const { data } = await supabaseApi.get('/orders', {
        params: {
          user_id: `eq.${userId}`,
          select: '*,order_items(*,products(*))',
          order: 'id.desc',
        },
      });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getUserPayments(userId: string): Promise<PaymentTransaction[]> {
    try {
      const { data } = await api.get(`/api/payments/user/${userId}`);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback
    }

    try {
      const orders = await this.getUserOrders(userId);
      return orders.map((o: any) => {
        const isRzp = String(o.payment_method || '').toLowerCase() === 'razorpay';
        const isCompleted = isRzp || o.status === 'confirmed' || o.status === 'delivered';
        return {
          id: o.payment?.id || `tx_${o.id}`,
          order_id: o.id,
          amount: Number(o.total_price || 0),
          payment_method: o.payment_method || 'COD',
          status: isCompleted ? 'completed' : o.status === 'cancelled' ? 'cancelled' : 'pending',
          razorpay_id: o.payment?.razorpay_id || null,
          created_at: o.created_at,
        };
      });
    } catch (e) {
      console.error('Error fetching payments:', e);
      return [];
    }
  },

  async createOrder(payload: CreateOrderPayload) {
    try {
      const { data } = await api.post('/api/orders/create', payload);
      if (data && !data.error) return data;
    } catch (e: any) {
      if (__DEV__) console.log('[ordersService] Backend createOrder failed, trying Supabase:', e.message);
    }

    try {
      const status =
        payload.status ||
        (payload.payment_method?.toLowerCase() === 'razorpay' && payload.razorpay_payment_id
          ? 'confirmed'
          : payload.payment_method?.toUpperCase() === 'COD'
          ? 'confirmed'
          : 'pending_payment');

      const { data: newOrder } = await supabaseApi.post('/orders', {
        user_id: payload.user_id,
        total_price: payload.total_price,
        payment_method: payload.payment_method || 'COD',
        status,
      });

      const orderId = newOrder?.[0]?.id || Date.now();

      if (Array.isArray(payload.items) && payload.items.length > 0) {
        const orderItems = payload.items.map((item) => ({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }));
        try {
          await supabaseApi.post('/order_items', orderItems);
        } catch {}
      }

      return {
        id: orderId,
        order_id: orderId,
        status: 'ok',
        ...newOrder?.[0],
      };
    } catch (err: any) {
      if (__DEV__) console.warn('[ordersService] Supabase createOrder fallback failed:', err.message);
      return { id: Date.now(), order_id: Date.now(), status: 'confirmed' };
    }
  },

  async cancelOrder(orderId: number) {
    const { data } = await api.put(`/api/orders/${orderId}/cancel`);
    return data;
  },

  async createRazorpayOrder(amount: number, metadata?: { receipt?: string; notes?: Record<string, any> }) {
    const cleanAmount = Number(amount) || 0;
    const amountInPaise = Math.max(100, Math.round(cleanAmount * 100));
    const receipt = metadata?.receipt || `rcpt_${Date.now()}`;

    // 1. Try backend endpoint first
    try {
      const { data } = await api.post('/api/orders/razorpay/create-order', {
        amount,
        receipt,
        notes: metadata?.notes || {},
      });
      if (data?.order?.id) {
        return data.order;
      }
    } catch (err) {
      console.log('Backend create-order route not available or error, using direct Razorpay fallback:', err);
    }

    // 2. Direct Razorpay API order creation fallback (Native standard pattern)
    const keyId = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T1oxnYBnlYBotP';
    const keySecret = '0fVI49gNTYKCTbVNtDj4rtue';
    
    // In React Native / Expo, btoa is available globally
    const authHeader = 'Basic ' + (typeof btoa !== 'undefined' ? btoa(`${keyId}:${keySecret}`) : (globalThis as any).btoa(`${keyId}:${keySecret}`));

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: metadata?.notes || {},
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Razorpay order creation failed: ${errText}`);
    }

    const orderData = await response.json();
    return orderData;
  },
};

