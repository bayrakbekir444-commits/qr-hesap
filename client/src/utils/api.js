import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname.startsWith('/panel') && window.location.pathname !== '/panel/login') {
        window.location.href = '/panel/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export function formatTL(amount) {
  const num = Number(amount) || 0;
  return num.toFixed(2).replace('.', ',') + ' \u20BA';
}
