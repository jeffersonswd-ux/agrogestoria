import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'agrogestor.access_token';
const REFRESH_KEY = 'agrogestor.refresh_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh?: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && original && !original._retried) {
      const refresh = tokenStore.getRefresh();
      if (refresh) {
        original._retried = true;
        try {
          refreshing =
            refreshing ??
            axios
              .post('/api/auth/refresh', { refreshToken: refresh })
              .then((r) => {
                tokenStore.set(r.data.accessToken, r.data.refreshToken);
                return r.data.accessToken as string;
              })
              .finally(() => {
                refreshing = null;
              });
          const token = await refreshing;
          if (token) {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          }
        } catch {
          tokenStore.clear();
          if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
        }
      } else {
        tokenStore.clear();
        if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: any): string {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Erro inesperado na comunicação com o servidor';
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join(' · ');
  return 'Erro inesperado';
}
