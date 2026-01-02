import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'cashier' | 'manager' | 'admin';
}

interface Session {
  id: string;
  userId: string;
  startedAt: string;
  openingCash: number;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),
      
      logout: () => set({ user: null, session: null, isAuthenticated: false }),
      
      setSession: (session) => set({ session }),
    }),
    {
      name: 'kutunza-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
