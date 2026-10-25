import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Address, UserProfile } from '../types';

const ADDRESS_STORAGE_KEY = 'auramart_user_address';
const PROFILE_STORAGE_KEY = 'auramart_user_profile';

export const userStorage = {
  async getLocalAddress(): Promise<Address | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          raw = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
        }
      } else {
        raw = await SecureStore.getItemAsync(ADDRESS_STORAGE_KEY);
      }
      if (raw) {
        return JSON.parse(raw) as Address;
      }
    } catch (e) {
      if (__DEV__) console.log('[userStorage] Failed to read local address:', e);
    }
    return null;
  },

  async saveLocalAddress(address: Address): Promise<void> {
    try {
      const serialized = JSON.stringify(address);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(ADDRESS_STORAGE_KEY, serialized);
        }
      } else {
        await SecureStore.setItemAsync(ADDRESS_STORAGE_KEY, serialized);
      }
    } catch (e) {
      if (__DEV__) console.log('[userStorage] Failed to save local address:', e);
    }
  },

  async clearLocalAddress(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(ADDRESS_STORAGE_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(ADDRESS_STORAGE_KEY);
      }
    } catch (e) {
      if (__DEV__) console.log('[userStorage] Failed to clear local address:', e);
    }
  },
};
