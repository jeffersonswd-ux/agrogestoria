import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, tokenStore } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  mustChangePassword: boolean;
  company: { id: string; clientName: string; companyName: string; status: string; simpleMode: boolean } | null;
  modules: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasModule: (moduleKey: string) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        tokenStore.set(data.accessToken, data.refreshToken);
        setUser(data.user);
        return data.user;
      },
      logout: async () => {
        const refreshToken = tokenStore.getRefresh();
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } catch {
          /* ignora falhas no logout */
        }
        tokenStore.clear();
        setUser(null);
      },
      refreshUser: loadMe,
      hasModule: (moduleKey: string) => !!user?.modules?.includes(moduleKey),
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
