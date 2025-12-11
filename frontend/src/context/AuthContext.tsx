import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, LoginPayload } from '../types';
import { AuthAPI } from '../services/adminApi';
import toast from 'react-hot-toast';

type AuthContextShape = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

const TOKEN_KEY = 'fixzep_token';
const USER_KEY = 'fixzep_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      const result = await AuthAPI.login(payload);
      setToken(result.token);
      setUser(result.user);
      toast.success('Welcome back, ' + result.user.name.split(' ')[0]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to login');
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    toast.success('Logged out');
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token && user), login, logout }),
    [login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
