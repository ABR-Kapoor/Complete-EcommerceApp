import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url?: string;
  address?: any;
}

interface UserStore {
  profile: UserProfile | null;
  loading: boolean;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  updateAddress: (userId: string, address: any) => Promise<void>;
  syncProfile: (data: any) => Promise<void>;
  fetchAddress: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      loading: false,
      setProfile: (profile) => set({ profile }),
      fetchProfile: async (userId) => {
        set({ loading: true });
        try {
          const res = await api.get(`/api/users/${userId}`);
          if (res.data) set({ profile: res.data });
        } catch (e) {
          console.error("Failed to fetch profile", e);
        } finally {
          set({ loading: false });
        }
      },
      fetchAddress: async (userId) => {
        try {
          const res = await api.get(`/api/users/${userId}/address`);
          const current = get().profile;
          if (current) set({ profile: { ...current, address: res.data } });
        } catch (e) {
          console.error("Failed to fetch address", e);
        }
      },
      updateProfile: async (userId, updates) => {
        const current = get().profile;
        // Optimistic update
        if (current) set({ profile: { ...current, ...updates } });
        
        try {
          await api.put(`/api/users/${userId}`, updates);
        } catch (e) {
          console.error("Update failed, rolling back", e);
          if (current) set({ profile: current }); // Rollback
        }
      },
      updateAddress: async (userId, address) => {
        const current = get().profile;
        // Optimistic update
        if (current) set({ profile: { ...current, address } });
        
        try {
          await api.post(`/api/users/${userId}/address`, address);
        } catch (e) {
          console.error("Address update failed, rolling back", e);
          if (current) set({ profile: current }); // Rollback
        }
      },
      syncProfile: async (data) => {
        try {
          const res = await api.post("/api/users/sync", data);
          if (res.data) {
            set({ profile: res.data });
          }
        } catch (e) {
          console.error("Sync failed", e);
        }
      }
    }),
    { name: "user-storage" }
  )
);
