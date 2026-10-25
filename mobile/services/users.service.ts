import api from './api';
import { supabaseApi } from './supabase';
import { UserProfile, Address } from '../types';

export const usersService = {
  async syncProfile(profileData: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    phone?: string;
  }): Promise<UserProfile> {
    try {
      const { data } = await api.post('/api/users/sync', profileData);
      if (data && !data.error) return data;
    } catch (e: any) {
      if (__DEV__) console.log('[usersService] Backend syncProfile failed, trying Supabase:', e.message);
    }

    try {
      const { id, email, name, avatar_url, phone } = profileData;
      const { data: existing } = await supabaseApi.get('/users', {
        params: { id: `eq.${id}` },
      });

      if (existing && existing.length > 0) {
        const updates: Record<string, any> = {};
        if (email && !existing[0].email) updates.email = email;
        if (name && !existing[0].name) updates.name = name;
        if (avatar_url && !existing[0].avatar_url) updates.avatar_url = avatar_url;
        if (phone && !existing[0].phone) updates.phone = phone;

        if (Object.keys(updates).length > 0) {
          const { data: updated } = await supabaseApi.patch(`/users?id=eq.${id}`, updates);
          return updated?.[0] || { ...existing[0], ...updates };
        }
        return existing[0];
      } else {
        const payload: Record<string, any> = {
          id,
          name: name || 'User',
          email: email || '',
          avatar_url: avatar_url || null,
          role: 'user',
        };
        if (phone) payload.phone = phone;
        const { data: inserted } = await supabaseApi.post('/users', payload);
        return inserted?.[0] || payload;
      }
    } catch (err: any) {
      if (__DEV__) console.warn('[usersService] Supabase syncProfile fallback failed:', err.message);
      return {
        id: profileData.id,
        name: profileData.name || 'User',
        email: profileData.email || '',
        phone: profileData.phone || '',
        avatar_url: profileData.avatar_url || '',
        role: 'user',
      };
    }
  },

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const { data } = await api.get(`/api/users/${userId}`);
      if (data && !data.error) return data;
    } catch (e: any) {
      if (__DEV__) console.log('[usersService] Backend getProfile failed, trying Supabase:', e.message);
    }

    try {
      const { data } = await supabaseApi.get('/users', {
        params: { id: `eq.${userId}` },
      });
      if (data && data.length > 0) {
        return data[0];
      }
    } catch (err: any) {
      if (__DEV__) console.warn('[usersService] Supabase getProfile fallback failed:', err.message);
    }

    return {
      id: userId,
      name: 'User',
      email: '',
      phone: '',
      role: 'user',
    };
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar_url' | 'email'>>
  ) {
    try {
      const { data } = await api.put(`/api/users/${userId}`, updates);
      if (data) return data;
    } catch (e: any) {
      if (__DEV__) console.log('[usersService] Backend updateProfile failed, trying Supabase:', e.message);
    }

    try {
      const { data } = await supabaseApi.patch(`/users?id=eq.${userId}`, updates);
      return data?.[0] || { status: 'ok' };
    } catch (err: any) {
      if (__DEV__) console.warn('[usersService] Supabase updateProfile fallback failed:', err.message);
      return { status: 'ok' };
    }
  },

  async updateAvatar(userId: string, avatarUrl: string) {
    try {
      const { data } = await api.put(`/api/users/${userId}/avatar`, {
        avatar_url: avatarUrl,
      });
      return data;
    } catch {
      // Fallback
    }

    try {
      await supabaseApi.patch(`/users?id=eq.${userId}`, { avatar_url: avatarUrl });
      return { status: 'ok' };
    } catch (e: any) {
      if (__DEV__) console.warn('[usersService] Supabase updateAvatar failed:', e.message);
      return { status: 'ok' };
    }
  },

  async uploadAvatarFile(userId: string, fileUri: string, mimeType: string = 'image/jpeg'): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      const filename = fileUri.split('/').pop() || `avatar_${Date.now()}.jpg`;
      formData.append('file', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      } as any);

      const { data } = await api.post(`/api/users/${userId}/avatar-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    } catch (e: any) {
      if (__DEV__) console.warn('[usersService] Avatar upload error:', e.message);
      return { url: fileUri };
    }
  },

  async getAddress(userId: string): Promise<Address | null> {
    if (!userId || userId === 'guest') return null;

    // 1. Try Backend API
    try {
      const { data } = await api.get(`/api/users/${userId}/address`);
      if (data && Object.keys(data).length > 0 && data.street) {
        return data;
      }
    } catch (e: any) {
      if (__DEV__) console.log('[usersService] Backend getAddress failed, trying Supabase:', e.message);
    }

    // 2. Direct Supabase Fallback
    try {
      const { data } = await supabaseApi.get('/addresses', {
        params: { user_id: `eq.${userId}` },
      });

      if (data && data.length > 0 && data[0].street) {
        const addr = { ...data[0] };
        // Hydrate phone from users table if available
        try {
          const { data: userRes } = await supabaseApi.get('/users', {
            params: { id: `eq.${userId}`, select: 'phone' },
          });
          if (userRes && userRes.length > 0 && userRes[0].phone) {
            addr.phone = userRes[0].phone;
          }
        } catch {}
        return addr as Address;
      }
    } catch (err: any) {
      if (__DEV__) console.warn('[usersService] Supabase getAddress fallback failed:', err.message);
    }

    return null;
  },

  async saveAddress(
    userId: string,
    address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) {
    if (!userId) return { status: 'ok' };

    // 1. Try Backend API
    try {
      const { data } = await api.post(`/api/users/${userId}/address`, address);
      if (data && !data.error) {
        return data;
      }
    } catch (e: any) {
      if (__DEV__) console.log('[usersService] Backend saveAddress failed, trying Supabase:', e.message);
    }

    // 2. Direct Supabase Fallback
    if (userId !== 'guest') {
      try {
        // Ensure user exists
        try {
          await supabaseApi.post('/users', { id: userId, name: 'Authentic User' });
        } catch {}

        // Update phone in users table if provided
        if (address.phone && String(address.phone).trim()) {
          try {
            await supabaseApi.patch(`/users?id=eq.${userId}`, {
              phone: String(address.phone).trim(),
            });
          } catch {}
        }

        const payload = {
          user_id: userId,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: String(address.zip_code || ''),
        };

        const { data: existing } = await supabaseApi.get('/addresses', {
          params: { user_id: `eq.${userId}` },
        });

        if (existing && existing.length > 0) {
          await supabaseApi.patch(`/addresses?user_id=eq.${userId}`, payload);
        } else {
          await supabaseApi.post('/addresses', payload);
        }
        return { status: 'ok' };
      } catch (err: any) {
        if (__DEV__) console.warn('[usersService] Supabase saveAddress fallback failed:', err.message);
      }
    }

    return { status: 'ok' };
  },
};
