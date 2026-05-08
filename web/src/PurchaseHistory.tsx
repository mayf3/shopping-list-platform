import { useState, useEffect } from 'react';
import { api, ApiError } from './api';

type HistoryItem = {
  id: number;
  item_name: string;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  price: number;
  store: string | null;
  purchased_at: string;
};

type Props = {
  token: string;
};

export function PurchaseHistory({ token }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/history', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '加载失败');
        setHistory(data.history ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mr-2" />
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">{error}</div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-sm">暂无购买历史</p>
      </div>
    );
  }

  // Group by date
  const grouped = history.reduce<Record<string, HistoryItem[]>>((acc, item) => {
    const date = new Date(item.purchased_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  // Calculate total
  const total = history.reduce((sum, h) => sum + (h.price ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">🕐 购买历史</h2>
        <span className="text-sm text-gray-400">
          共 ¥{total.toFixed(2)}
        </span>
      </div>

      {Object.entries(grouped).map(([date, items]) => {
        const dayTotal = items.reduce((s, i) => s + (i.price ?? 0), 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">{date}</h3>
              <span className="text-xs text-gray-400">¥{dayTotal.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 flex items-center gap-3 shadow-sm"
                >
                  <span className="text-lg">{item.category_icon || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {item.item_name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      {item.category_name && <span>{item.category_name}</span>}
                      {item.store && <span>📍{item.store}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-teal-600 dark:text-teal-400 shrink-0">
                    ¥{(item.price ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
