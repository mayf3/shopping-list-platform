import { useState, useEffect, useCallback } from 'react';
import type { User, Category, Item, Summary } from './types';
import { api, ApiError } from './api';
import { LoginPage } from './LoginPage';
import { NavBar } from './NavBar';
import { MobileNav } from './MobileNav';
import { ItemList } from './ItemList';
import { ItemForm } from './ItemForm';
import { Dashboard } from './Dashboard';
import { PurchaseHistory } from './PurchaseHistory';
import { CategoryManager } from './CategoryManager';
import { StatsCharts } from './StatsCharts';

export type Page = 'list' | 'history' | 'dashboard' | 'settings';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('list');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [error, setError] = useState('');

  // dark mode
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('dark', String(dark));
  }, [dark]);

  // restore session
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api.me(token);
        setUser(res.user);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
      }
    })();
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [catRes, itemRes, sumRes] = await Promise.all([
        api.categories(token),
        api.items(token, 'pending'),
        api.summary(token)
      ]);
      setCategories(catRes.categories);
      setItems(itemRes.items);
      setSummary(sumRes);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogin = async (username: string, password: string) => {
    setError('');
    try {
      const res = await api.login(username, password);
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('登录失败');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setItems([]);
    setCategories([]);
    setSummary(null);
  };

  const handleSaveItem = async (payload: Parameters<typeof api.createItem>[1]) => {
    if (!token) return;
    try {
      if (editingItem) {
        await api.updateItem(token, editingItem.id, payload);
      } else {
        await api.createItem(token, payload);
      }
      setShowForm(false);
      setEditingItem(null);
      await loadData();
    } catch (e) {
      if (e instanceof ApiError) throw new Error(e.message);
      throw new Error('保存失败');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!token) return;
    await api.deleteItem(token, id);
    await loadData();
  };

  const handlePurchaseItem = async (id: number, actualPrice: number | null, store?: string | null) => {
    if (!token) return;
    await api.purchaseItem(token, id, actualPrice, store);
    await loadData();
  };

  const handleRefreshCategories = async () => {
    if (!token) return;
    const res = await api.categories(token);
    setCategories(res.categories);
  };

  // Not logged in
  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} error={error} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-800 dark:text-gray-200">
      <NavBar
        user={user}
        onLogout={handleLogout}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
      />

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {page === 'list' && (
          <ItemList
            items={items}
            categories={categories}
            loading={loading}
            onEdit={(item) => {
              setEditingItem(item);
              setShowForm(true);
            }}
            onDelete={handleDeleteItem}
            onPurchase={handlePurchaseItem}
          />
        )}
        {page === 'dashboard' && (
          <Dashboard
            summary={summary}
            loading={loading}
          />
        )}
        {page === 'history' && (
          <PurchaseHistory token={token} />
        )}
        {page === 'settings' && (
          <div className="space-y-6">
            <StatsCharts token={token} />
            <CategoryManager
              token={token}
              categories={categories}
              onRefresh={handleRefreshCategories}
            />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold mb-3">账户信息</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>用户名：{user.username}</p>
                <p>角色：{user.role === 'admin' ? '管理员' : '普通用户'}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      {page === 'list' && (
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="fixed right-5 bottom-24 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-lg flex items-center justify-center text-3xl transition-colors z-30"
          aria-label="添加物品"
        >
          +
        </button>
      )}

      <MobileNav page={page} onChange={setPage} />

      {showForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          onSave={handleSaveItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
