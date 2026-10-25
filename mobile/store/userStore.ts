import { create } from 'zustand';
import { UserProfile, Address } from '../types';
import { usersService } from '../services/users.service';
import { userStorage } from '../services/userStorage';

interface UserState {
  profile: UserProfile | null;
  address: Address | null;
  loading: boolean;
  error: string | null;

  initUser: () => Promise<void>;
  syncProfile: (data: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    phone?: string;
  }) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  fetchAddress: (userId?: string | null) => Promise<void>;
  saveAddress: (
    userId: string | undefined | null,
    address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'email'>>) => Promise<void>;
  setAvatarUrl: (avatarUrl: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  address: null,
  loading: false,
  error: null,

  initUser: async () => {
    try {
      const localAddress = await userStorage.getLocalAddress();
      if (localAddress) {
        set((state) => ({
          address: localAddress,
          profile: state.profile
            ? { ...state.profile, phone: localAddress.phone || state.profile.phone }
            : null,
        }));
      }
    } catch {}
  },

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
      // 1. Ensure local address is loaded first
      if (!get().address) {
        const local = await userStorage.getLocalAddress();
        if (local) {
          set((state) => ({
            address: local,
            profile: state.profile
              ? { ...state.profile, phone: local.phone || state.profile.phone }
              : null,
          }));
        }
      }

      // 2. Fetch from cloud if user is signed in
      if (userId && userId !== 'guest') {
        const cloudAddress = await usersService.getAddress(userId);
        if (cloudAddress && cloudAddress.street) {
          set((state) => ({
            address: cloudAddress,
            profile: state.profile
              ? { ...state.profile, phone: cloudAddress.phone || state.profile.phone }
              : null,
          }));
          await userStorage.saveLocalAddress(cloudAddress);
        }
      }
    } catch (err: any) {
      if (__DEV__) console.log('fetchAddress error:', err.message);
    }
  },

  saveAddress: async (userId, addressData) => {
    const activeUserId = userId || 'guest';
    const nextAddress: Address = {
      user_id: activeUserId,
      street: addressData.street,
      city: addressData.city,
      state: addressData.state,
      zip_code: addressData.zip_code,
      phone: addressData.phone || '',
    };

    // 1. Immediate optimistic state update
    set((state) => ({
      address: nextAddress,
      profile: state.profile
        ? { ...state.profile, phone: addressData.phone || state.profile.phone }
        : null,
      error: null,
    }));

    // 2. Persist locally immediately
    await userStorage.saveLocalAddress(nextAddress);

    // 3. Background sync to Supabase/backend
    if (activeUserId !== 'guest') {
      try {
        await usersService.saveAddress(activeUserId, addressData);
      } catch (err: any) {
        if (__DEV__) console.log('[userStore] saveAddress cloud sync notice:', err.message);
      }
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

  clearUser: () => {
    set({ profile: null, address: null, loading: false, error: null });
    userStorage.clearLocalAddress();
  },
}));
