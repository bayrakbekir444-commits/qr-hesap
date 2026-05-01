import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const PRODUCTION_API = 'https://qr-hesap.onrender.com';
const FALLBACK_HOST = '192.168.1.7';

// Expo dev server host'unu otomatik bulur
const getDevHost = () => {
  try {
    const candidates = [
      Constants.expoConfig?.hostUri,
      Constants.expoGoConfig?.debuggerHost,
      Constants.manifest2?.extra?.expoClient?.hostUri,
      Constants.manifest?.debuggerHost,
      Constants.manifest?.hostUri,
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        const host = c.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          return host;
        }
      }
    }
  } catch {}
  return FALLBACK_HOST;
};

// Önce env, sonra production, en son local dev
// EXPO_PUBLIC_API_URL set edilirse onu kullan
// Aksi halde her ortamda canlı Render'a git (basit)
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  PRODUCTION_API;

console.log('🔗 API_URL =', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('→', (config.method || '').toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('←', res.status, res.config.url, 'data-len:', JSON.stringify(res.data || '').length);
    return res;
  },
  (err) => {
    console.log('✗ ERROR', err.response?.status || 'NETWORK', err.config?.url, err.message);
    return Promise.reject(err);
  }
);

export const formatPrice = (kurus) => {
  const tl = (kurus / 100).toFixed(2).replace('.', ',');
  return `${tl} ₺`;
};

export default api;
