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
}

interface UserStore {
  profile: UserProfile | null;
  loading: boolean;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      loading: false,
      setProfile: (profile) => set({ profile }),
      fetchProfile: async (userId) => {
        set({ loading: true });
        try {
          const res = await api.get(`/api/users/${userId}`);
          if (res.data) {
            set({ profile: res.data });
          }
        } catch (e) {
          console.error("Failed to fetch user profile", e);
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: "user-storage" }
  )
);
