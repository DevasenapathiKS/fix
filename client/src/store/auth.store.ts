import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, AuthUser } from '../types/customer';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (payload: AuthResponse) => void;
  logout: () => void;
  updateUser: (payload: Partial<AuthUser>) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      updateUser: (payload) =>
        set((state) =>
          state.user
            ? {
                user: { ...state.user, ...payload }
              }
            : state
        ),
      isAuthenticated: () => Boolean(get().token)
    }),
    {
      name: 'fixzep-client-auth'
    }
  )
);
