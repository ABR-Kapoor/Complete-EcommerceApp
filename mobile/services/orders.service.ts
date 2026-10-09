import api from './api';
import { Order, CreateOrderPayload } from '../types';

export const ordersService = {
  async getUserOrders(userId: string): Promise<Order[]> {
    const { data } = await api.get(`/api/orders/user/${userId}`);
    return data;
  },

  async createOrder(payload: CreateOrderPayload) {
    const { data } = await api.post('/api/orders/create', payload);
    return data;
  },

  async cancelOrder(orderId: number) {
    const { data } = await api.put(`/api/orders/${orderId}/cancel`);
    return data;
  },
};
