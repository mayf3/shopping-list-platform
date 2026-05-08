import { useState, useEffect } from 'react';
import type { Item } from './types';

type Props = {
  token: string;
};

type HistoryRow = {
  id: number;
  item_name: string;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  price: number;
  store: string | null;
  purchased_at: string;
};

type CategoryStat = {
  name: string;
  icon: string;
  total: number;
  count: number;
};

type DailyStat = {
  date: string;
  total: number;
};

export function StatsCharts({ token }: Props) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'category' | 'daily'>('category');

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
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-5">
        <div className="flex items-center justify-center py-10 text-gray-400">
          <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full mr-2" />
          加载统计数据...
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-5 text-center text-gray-400 text-sm">
        暂无统计数据
      </div>
    );
  }

  // Category stats
  const categoryMap = new Map<string, CategoryStat>();
  for (const h of history) {
    const key = h.category_name || '其他';
    const existing = categoryMap.get(key);
    if (existing) {
      existing.total += h.price ?? 0;
      existing.count += 1;
    } else {
      categoryMap.set(key, {
        name: key,
        icon: h.category_icon || '📦',
        total: h.price ?? 0,
        count: 1
      });
    }
  }
  const categoryStats = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  const categoryMax = Math.max(...categoryStats.map((s) => s.total), 1);

  // Daily stats (last 14 days)
  const dailyMap = new Map<string, number>();
  for (const h of history) {
    const date = h.purchased_at ? h.purchased_at.slice(0, 10) : '';
    if (!date) continue;
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + (h.price ?? 0));
  }
  const dailyStats: DailyStat[] = Array.from(dailyMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
  const dailyMax = Math.max(...dailyStats.map((s) => s.total), 1);

  // Total
  const totalSpent = history.reduce((s, h) => s + (h.price ?? 0), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">📊 消费统计</h3>
        <span className="text-sm text-gray-400">
          总计 ¥{totalSpent.toFixed(2)}
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
        <button
          onClick={() => setTab('category')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
            tab === 'category'
              ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
              : 'text-gray-400'
          }`}
        >
          按分类
        </button>
        <button
          onClick={() => setTab('daily')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
            tab === 'daily'
              ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
              : 'text-gray-400'
          }`}
        >
          按日期
        </button>
      </div>

      {tab === 'category' ? (
        <div className="space-y-3">
          {categoryStats.map((stat) => (
            <div key={stat.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <span>{stat.icon}</span>
                  {stat.name}
                </span>
                <span className="text-gray-400">
                  ¥{stat.total.toFixed(2)} ({stat.count}件)
                </span>
              </div>
              <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all"
                  style={{ width: `${(stat.total / categoryMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {dailyStats.map((stat) => (
            <div key={stat.date}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(stat.date + 'T00:00:00').toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className="text-gray-400">¥{stat.total.toFixed(2)}</span>
              </div>
              <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full transition-all"
                  style={{ width: `${(stat.total / dailyMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {dailyStats.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">暂无数据</p>
          )}
        </div>
      )}
    </div>
  );
}
