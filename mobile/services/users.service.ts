import api from './api';
import { UserProfile, Address } from '../types';

export const usersService = {
  async syncProfile(profileData: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    phone?: string;
  }): Promise<UserProfile> {
    const { data } = await api.post('/api/users/sync', profileData);
    return data;
  },

  async getProfile(userId: string): Promise<UserProfile> {
    const { data } = await api.get(`/api/users/${userId}`);
    return data;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar_url' | 'email'>>
  ) {
    const { data } = await api.put(`/api/users/${userId}`, updates);
    return data;
  },

  async updateAvatar(userId: string, avatarUrl: string) {
    const { data } = await api.put(`/api/users/${userId}/avatar`, {
      avatar_url: avatarUrl,
    });
    return data;
  },

  async uploadAvatarFile(userId: string, fileUri: string, mimeType: string = 'image/jpeg'): Promise<{ url: string }> {
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
  },

  async getAddress(userId: string): Promise<Address | null> {
    const { data } = await api.get(`/api/users/${userId}/address`);
    return data && Object.keys(data).length > 0 ? data : null;
  },

  async saveAddress(userId: string, address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data } = await api.post(`/api/users/${userId}/address`, address);
    return data;
  },
};
