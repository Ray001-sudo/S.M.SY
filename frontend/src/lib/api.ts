import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1` : '/api/v1',
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('shule360-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {}
  }
  return config;
});

let refreshing = false;
api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry && !refreshing && !orig.url?.includes('/auth/')) {
    orig._retry = true; refreshing = true;
    try {
      const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
      const { useAuthStore } = await import('@/store/auth.store');
      useAuthStore.getState().setToken(data.access_token);
      orig.headers.Authorization = `Bearer ${data.access_token}`;
      return api(orig);
    } catch {
      const { useAuthStore } = await import('@/store/auth.store');
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
    } finally { refreshing = false; }
  }
  return Promise.reject(err);
});

export default api;
