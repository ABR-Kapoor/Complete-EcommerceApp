import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CartItem } from '../types';

const STORAGE_KEY = 'auramart_cart_items';

export const cartStorage = {
  async getLocalCart(): Promise<CartItem[]> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          raw = window.localStorage.getItem(STORAGE_KEY);
        }
      } else {
        raw = await SecureStore.getItemAsync(STORAGE_KEY);
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[cartStorage] Failed to read local cart:', e);
    }
    return [];
  },

  async saveLocalCart(items: CartItem[]): Promise<void> {
    try {
      const serialized = JSON.stringify(items);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, serialized);
        }
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, serialized);
      }
    } catch (e) {
      if (__DEV__) console.log('[cartStorage] Failed to save local cart:', e);
    }
  },

  async clearLocalCart(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      }
    } catch (e) {
      if (__DEV__) console.log('[cartStorage] Failed to clear local cart:', e);
    }
  },
};
