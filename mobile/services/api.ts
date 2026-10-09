import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://abrecom-backend.vercel.app';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore may fail in development — continue without token
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.log('[API Error]', error.config?.url, error.response?.status, error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default api;
