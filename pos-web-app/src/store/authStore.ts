import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api';
import { wsService } from '../lib/websocket';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'cashier' | 'manager' | 'admin';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.login(username, password);
          const { user, token } = response.data;
          
          apiClient.setToken(token);
          wsService.connect(user.id, token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        wsService.disconnect();
        apiClient.clearToken();
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      validateSession: async () => {
        const { token } = get();
        
        if (!token) {
          return false;
        }
        
        try {
          const response = await apiClient.validateSession(token);
          
          if (response.valid) {
            apiClient.setToken(token);
            return true;
          } else {
            get().logout();
            return false;
          }
        } catch (error) {
          get().logout();
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'kutunza-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
