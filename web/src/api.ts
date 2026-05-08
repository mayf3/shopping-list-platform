import type { Category, Item, ItemPayload, Session, Summary } from './types';

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

  items: (token: string, status: 'pending' | 'purchased' | 'all' = 'pending') =>
    request<{ items: Item[] }>(`/api/items?status=${status}`, token),

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

  summary: (token: string) => request<Summary>('/api/stats/summary', token)
};

