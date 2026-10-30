import { create } from 'zustand';
import { UserProfile, AuthResponse } from '@proxispeak/shared';
import { api } from '../services/api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, avatar?: string) => Promise<boolean>;
  loadProfile: () => Promise<void>;
  updateProfile: (data: { username?: string; avatar?: string }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const getStoredToken = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('proxispeak_token')
      : null;
  } catch {
    return null;
  }
};

const setStoredToken = (token: string | null) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('proxispeak_token', token);
      } else {
        window.localStorage.removeItem('proxispeak_token');
      }
    }
  } catch {}
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', {
        email,
        password,
      });

      const { user, tokens } = res.data;
      setStoredToken(tokens.accessToken);
      set({
        user,
        token: tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  register: async (username, email, password, avatar = 'avatar-1') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register', {
        username,
        email,
        password,
        avatar,
      });

      const { user, tokens } = res.data;
      setStoredToken(tokens.accessToken);
      set({
        user,
        token: tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  loadProfile: async () => {
    const token = localStorage.getItem('proxispeak_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const res = await api.get<{ success: boolean; data: { user: UserProfile } }>('/api/auth/me');
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      setStoredToken(null);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await api.put<{ success: boolean; data: { user: UserProfile } }>('/api/auth/profile', data);
      set({ user: res.data.user });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  logout: () => {
    setStoredToken(null);
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
