import { create } from 'zustand';
import { AuthService } from '../services/auth/AuthService';

interface User {
  id: string;
  email: string;
  displayName: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.login(email, password);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  register: async (
    email: string,
    password: string,
    displayName?: string,
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.register(email, password, displayName);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async (): Promise<boolean> => {
    try {
      const isAuthenticated = await AuthService.isAuthenticated();
      set({ isAuthenticated });
      return isAuthenticated;
    } catch {
      set({ isAuthenticated: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
