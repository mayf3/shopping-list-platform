export type User = {
  id: number;
  username: string;
  role: 'admin' | 'user';
};

export type Session = {
  token: string;
  user: User;
};

export type Priority = 'high' | 'medium' | 'low';
export type ItemStatus = 'pending' | 'purchased' | 'cancelled';

export type Category = {
  id: number;
  name: string;
  icon: string;
  parent_id: number | null;
  parent_name?: string | null;
  sort_order: number;
  created_at: string;
};

export type Item = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category_id: number | null;
  category_name: string;
  category_icon: string;
  group_name: string;
  group_icon: string;
  priority: Priority;
  status: ItemStatus;
  estimated_price: number | null;
  actual_price: number | null;
  store: string | null;
  note: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
  purchased_at: string | null;
};

export type Summary = {
  month: string;
  monthly_budget: number;
  spent_this_month: number;
  remaining_budget: number;
  pending_count: number;
  pending_estimated_total: number;
  purchased_this_month_count: number;
  recent_purchased: Item[];
};

export type ItemPayload = {
  name: string;
  quantity: number;
  unit: string;
  category_id: number | null;
  priority: Priority;
  estimated_price?: number | null;
  actual_price?: number | null;
  store?: string | null;
  note?: string | null;
  url?: string | null;
};

