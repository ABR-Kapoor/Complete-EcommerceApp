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
  setAvatarUrl: (avatarUrl: string) => void;
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
      set((state) => ({
        profile,
        address: state.address
          ? { ...state.address, phone: state.address.phone || profile?.phone || '' }
          : null,
      }));
    } catch (err: any) {
      if (__DEV__) console.log('fetchProfile error:', err.message);
    }
  },

  fetchAddress: async (userId) => {
    try {
      const address = await usersService.getAddress(userId);
      set((state) => ({
        address: address
          ? { ...address, phone: address.phone || state.profile?.phone || '' }
          : null,
      }));
    } catch (err: any) {
      if (__DEV__) console.log('fetchAddress error:', err.message);
    }
  },

  saveAddress: async (userId, addressData) => {
    try {
      await usersService.saveAddress(userId, addressData);
      const address = await usersService.getAddress(userId);
      set((state) => {
        const phone = addressData.phone || address?.phone || state.profile?.phone || '';
        return {
          address: {
            ...(address || addressData),
            user_id: userId,
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            zip_code: addressData.zip_code,
            phone,
          } as Address,
          profile: state.profile
            ? { ...state.profile, phone: phone || state.profile.phone }
            : null,
        };
      });
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

  setAvatarUrl: (avatarUrl: string) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, avatar_url: avatarUrl } : null,
    })),

  clearUser: () => set({ profile: null, address: null, loading: false, error: null }),
}));
