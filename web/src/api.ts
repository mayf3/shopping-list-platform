import type { Category, Item, ItemFilters, ItemPayload, ItemStatus, Session, Summary } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const request = async <T>(path: string, token?: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error ?? '请求失败', response.status);
  }

  return data as T;
};

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: Session['user'] }>('/api/auth/login', undefined, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  me: (token: string) => request<{ user: Session['user'] }>('/api/me', token),

  categories: (token: string) => request<{ categories: Category[] }>('/api/categories', token),

  createCategory: (token: string, payload: Partial<Category>) =>
    request<{ category: Category }>('/api/categories', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateCategory: (token: string, id: number, payload: Partial<Category>) =>
    request<{ category: Category }>(`/api/categories/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteCategory: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/categories/${id}`, token, {
      method: 'DELETE'
    }),

  items: (token: string, query: Partial<ItemFilters> | ItemStatus | 'all' = 'pending') => {
    const params = new URLSearchParams();

    if (typeof query === 'string') {
      params.set('status', query);
    } else {
      if (query.status) params.set('status', query.status);
      if (query.search?.trim()) params.set('search', query.search.trim());
      if (query.category_id) params.set('category_id', query.category_id);
      if (query.priority && query.priority !== 'all') params.set('priority', query.priority);
      if (query.store?.trim()) params.set('store', query.store.trim());
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<{ items: Item[] }>(`/api/items${suffix}`, token);
  },

  createItem: (token: string, payload: ItemPayload) =>
    request<{ item: Item }>('/api/items', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateItem: (token: string, id: number, payload: ItemPayload) =>
    request<{ item: Item }>(`/api/items/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteItem: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/items/${id}`, token, {
      method: 'DELETE'
    }),

  purchaseItem: (token: string, id: number, actualPrice: number | null, store?: string | null) =>
    request<{ item: Item }>(`/api/items/${id}/purchase`, token, {
      method: 'PATCH',
      body: JSON.stringify({ actual_price: actualPrice, store })
    }),

  batchPurchaseItems: (token: string, ids: number[]) =>
    request<{ ok: boolean; updated: number }>('/api/items/batch-purchase', token, {
      method: 'POST',
      body: JSON.stringify({ ids })
    }),

  batchDeleteItems: (token: string, ids: number[]) =>
    request<{ ok: boolean; deleted: number }>('/api/items/batch-delete', token, {
      method: 'POST',
      body: JSON.stringify({ ids })
    }),

  summary: (token: string) => request<Summary>('/api/stats/summary', token)
};
