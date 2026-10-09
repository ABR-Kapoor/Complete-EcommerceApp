import { create } from 'zustand';
import { UserProfile, Address } from '../types';
import { usersService } from '../services/users.service';

interface UserState {
  profile: UserProfile | null;
  address: Address | null;
  loading: boolean;
  error: string | null;

  syncProfile: (data: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    phone?: string;
  }) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  fetchAddress: (userId: string) => Promise<void>;
  saveAddress: (userId: string, address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'email'>>) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  address: null,
  loading: false,
  error: null,

  syncProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const profile = await usersService.syncProfile(data);
      set({ profile, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchProfile: async (userId) => {
    try {
      const profile = await usersService.getProfile(userId);
      set({ profile });
    } catch (err: any) {
      if (__DEV__) console.log('fetchProfile error:', err.message);
    }
  },

  fetchAddress: async (userId) => {
    try {
      const address = await usersService.getAddress(userId);
      set({ address });
    } catch (err: any) {
      if (__DEV__) console.log('fetchAddress error:', err.message);
    }
  },

  saveAddress: async (userId, addressData) => {
    try {
      await usersService.saveAddress(userId, addressData);
      const address = await usersService.getAddress(userId);
      set({ address });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateProfile: async (userId, updates) => {
    try {
      await usersService.updateProfile(userId, updates);
      const profile = await usersService.getProfile(userId);
      set({ profile });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearUser: () => set({ profile: null, address: null, loading: false, error: null }),
}));
