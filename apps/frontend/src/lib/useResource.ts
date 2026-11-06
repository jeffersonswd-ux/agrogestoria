import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from './api';

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: any;
}

export function useList<T = any>(path: string, params: QueryOptions = {}, enabled = true) {
  return useQuery({
    queryKey: ['list', path, params],
    queryFn: async () => {
      const { data } = await api.get(path, { params });
      return data as { data: T[]; total: number; page: number; pageSize: number; totalPages: number } & Record<string, any>;
    },
    enabled,
  });
}

export function useResource<T = any>(path: string, id?: string) {
  return useQuery({
    queryKey: ['resource', path, id],
    queryFn: async () => (await api.get(`${path}/${id}`)).data as T,
    enabled: !!id,
  });
}

export function useMutationApi<TBody = any, TResult = any>(
  path: string,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post',
  options: { invalidate?: any[]; onSuccess?: (data: TResult) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TBody) => {
      const url = method === 'post' ? path : `${path}/${(body as any)?.id ?? ''}`;
      const { data } = await api[method](url, body);
      return data as TResult;
    },
    onSuccess: (data) => {
      (options.invalidate || []).forEach((key) => qc.invalidateQueries({ queryKey: key } as any));
      options.onSuccess?.(data);
    },
  });
}

export { apiErrorMessage };
