import api from './api';
import { Order, CreateOrderPayload, PaymentTransaction } from '../types';

export const ordersService = {
  async getUserOrders(userId: string): Promise<Order[]> {
    const { data } = await api.get(`/api/orders/user/${userId}`);
    return data;
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
    const { data } = await api.post('/api/orders/create', payload);
    return data;
  },

  async cancelOrder(orderId: number) {
    const { data } = await api.put(`/api/orders/${orderId}/cancel`);
    return data;
  },

  async createRazorpayOrder(amount: number, metadata?: { receipt?: string; notes?: Record<string, any> }) {
    const amountInPaise = Math.max(100, Math.round(amount * 100));
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

