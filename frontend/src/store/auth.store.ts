import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User { id: string; full_name: string; role: string; school_id: string; }
interface AuthState {
  user: User | null; token: string | null; isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.access_token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      },
      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },
      setToken: (token) => {
        set({ token });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
    }),
    {
      name: 'shule360-auth',
      partialize: s => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated })
    }
  )
);
