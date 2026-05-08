import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ListChecks,
  Pencil,
  Search,
  Trash2,
  X
} from 'lucide-react';
import type { Category, Item, ItemFilters, ItemStatus, Priority } from './types';

type Props = {
  items: Item[];
  categories: Category[];
  filters: ItemFilters;
  storeOptions: string[];
  loading: boolean;
  onFiltersChange: (patch: Partial<ItemFilters>) => void;
  onClearFilters: () => void;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => Promise<void>;
  onPurchase: (id: number, actualPrice: number | null, store?: string | null) => Promise<void>;
  onBatchPurchase: (ids: number[]) => Promise<void>;
  onBatchDelete: (ids: number[]) => Promise<void>;
};

type ViewMode = 'category' | 'store' | 'priority';
type GroupTone = 'red' | 'amber' | 'gray';
type BatchConfirm = 'purchase' | 'delete';

type Group = {
  key: string;
  name: string;
  icon: string;
  tone?: GroupTone;
  items: Item[];
};

const viewTabs: { key: ViewMode; label: string }[] = [
  { key: 'category', label: '分类视图' },
  { key: 'store', label: '商店视图' },
  { key: 'priority', label: '优先级视图' }
];

const statusLabels: Record<ItemStatus | 'all', string> = {
  all: '全部状态',
  pending: '待购买',
  purchased: '已购买',
  cancelled: '已取消'
};

const priorityMeta: Record<Priority, { label: string; shortLabel: string; icon: string; tone: GroupTone }> = {
  high: { label: '高优先级', shortLabel: '高', icon: '🔴', tone: 'red' },
  medium: { label: '中优先级', shortLabel: '中', icon: '🟡', tone: 'amber' },
  low: { label: '低优先级', shortLabel: '低', icon: '⚪', tone: 'gray' }
};

const isViewMode = (value: string | null): value is ViewMode =>
  value === 'category' || value === 'store' || value === 'priority';

export function ItemList({
  items,
  categories,
  filters,
  storeOptions,
  loading,
  onFiltersChange,
  onClearFilters,
  onEdit,
  onDelete,
  onPurchase,
  onBatchPurchase,
  onBatchDelete
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [batchConfirm, setBatchConfirm] = useState<BatchConfirm | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'purchase' | 'batch'; id?: number } | null>(
    null
  );
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'category';
    const saved = localStorage.getItem('shopping-list-view');
    return isViewMode(saved) ? saved : 'category';
  });

  useEffect(() => {
    localStorage.setItem('shopping-list-view', view);
  }, [view]);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const categoryOptions = useMemo(() => {
    const childrenByParent = new Map<number, Category[]>();
    const topCategories: Category[] = [];

    for (const category of categories) {
      if (category.parent_id === null) {
        topCategories.push(category);
      } else {
        const siblings = childrenByParent.get(category.parent_id) ?? [];
        siblings.push(category);
        childrenByParent.set(category.parent_id, siblings);
      }
    }

    return topCategories.flatMap((category) => [
      { category, label: `${category.icon} ${category.name}` },
      ...(childrenByParent.get(category.id) ?? []).map((child) => ({
        category: child,
        label: `- ${child.icon} ${child.name}`
      }))
    ]);
  }, [categories]);

  const groups = useMemo(() => {
    if (view === 'priority') {
      return (['high', 'medium', 'low'] as Priority[])
        .map((priority) => {
          const meta = priorityMeta[priority];
          return {
            key: priority,
            name: meta.label,
            icon: meta.icon,
            tone: meta.tone,
            items: items.filter((item) => item.priority === priority)
          };
        })
        .filter((group) => group.items.length > 0);
    }

    const grouped = new Map<string, Group>();

    for (const item of items) {
      const key = view === 'store' ? item.store?.trim() || '未指定商店' : item.group_name || '其他';
      const group = grouped.get(key);
      if (group) {
        group.items.push(item);
      } else {
        grouped.set(key, {
          key,
          name: key,
          icon: view === 'store' ? (item.store ? '🏬' : '📍') : item.group_icon || '📦',
          items: [item]
        });
      }
    }

    return Array.from(grouped.values());
  }, [items, view]);

  const selectedCount = selectedIds.size;
  const visibleIds = useMemo(() => items.map((item) => item.id), [items]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category_id !== '' ||
    filters.priority !== 'all' ||
    filters.store !== '' ||
    filters.status !== 'pending';

  const priorityLabel = (priority: Item['priority']) => {
    const meta = priorityMeta[priority];
    const className =
      priority === 'high'
        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
        : priority === 'medium'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300';

    return <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${className}`}>{meta.shortLabel}</span>;
  };

  const statusLabel = (status: Item['status']) => {
    const className =
      status === 'pending'
        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
        : status === 'purchased'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300';

    return <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${className}`}>{statusLabels[status]}</span>;
  };

  const groupHeaderClass = (tone?: GroupTone) => {
    if (tone === 'red') return 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20';
    if (tone === 'amber') return 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20';
    if (tone === 'gray') return 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800';
    return 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800';
  };

  const articleClass = (item: Item) => {
    const priorityBorder =
      view === 'priority' && item.priority === 'high'
        ? 'border-l-4 border-l-red-500'
        : view === 'priority' && item.priority === 'medium'
        ? 'border-l-4 border-l-amber-400'
        : view === 'priority'
        ? 'border-l-4 border-l-gray-300 dark:border-l-gray-600'
        : '';

    return `rounded-lg border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-700/60 dark:bg-gray-800 ${priorityBorder}`;
  };

  const toggleBatchMode = () => {
    if (batchMode) {
      setSelectedIds(new Set());
    }
    setBatchMode(!batchMode);
    setError('');
  };

  const toggleItem = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds));
  };

  const purchaseItem = async (item: Item) => {
    setError('');
    setPendingAction({ type: 'purchase', id: item.id });
    try {
      await onPurchase(item.id, null, item.store);
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记购买失败');
    } finally {
      setPendingAction(null);
    }
  };

  const deleteItem = async () => {
    if (confirmDeleteId === null) return;

    setError('');
    setPendingAction({ type: 'delete', id: confirmDeleteId });
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setPendingAction(null);
    }
  };

  const runBatchAction = async () => {
    if (!batchConfirm || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    setError('');
    setPendingAction({ type: 'batch' });
    try {
      if (batchConfirm === 'purchase') {
        await onBatchPurchase(ids);
      } else {
        await onBatchDelete(ids);
      }
      setSelectedIds(new Set());
      setBatchMode(false);
      setBatchConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量操作失败');
    } finally {
      setPendingAction(null);
    }
  };

  const body = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="mr-2 h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          加载中...
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="py-20 text-center text-gray-400 dark:text-gray-500">
          <div className="mb-3 text-4xl">{hasActiveFilters ? '🔎' : '✨'}</div>
          <p className="text-sm">{hasActiveFilters ? '没有符合条件的物品' : '购物清单是空的'}</p>
          <p className="mt-1 text-xs">{hasActiveFilters ? '调整筛选条件后再试试' : '点击右下角按钮添加物品'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {groups.map((group) => {
          const collapseKey = `${view}:${group.key}`;
          const isCollapsed = collapsed[collapseKey] ?? false;

          return (
            <section key={collapseKey} className="space-y-2">
              <button
                type="button"
                onClick={() => setCollapsed((state) => ({ ...state, [collapseKey]: !isCollapsed }))}
                className={`flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm font-semibold transition ${groupHeaderClass(
                  group.tone
                )}`}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span>{group.icon}</span>
                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                <span className="text-gray-300 dark:text-gray-600">({group.items.length})</span>
              </button>

              {!isCollapsed && (
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isPurchasing = pendingAction?.type === 'purchase' && pendingAction.id === item.id;
                    const checked = selectedIds.has(item.id);

                    return (
                      <article key={item.id} className={articleClass(item)}>
                        <div className="flex items-start gap-3">
                          {batchMode && (
                            <label className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleItem(item.id)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                aria-label={`选择 ${item.name}`}
                              />
                            </label>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                {item.name}
                              </span>
                              {priorityLabel(item.priority)}
                              {(filters.status === 'all' || item.status !== 'pending') && statusLabel(item.status)}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                              <span>
                                {item.quantity}
                                {item.unit}
                              </span>
                              <span>
                                {item.category_icon} {item.category_name}
                              </span>
                              {item.estimated_price != null && <span>约 ¥{item.estimated_price.toFixed(2)}</span>}
                              {item.store && <span>📍{item.store}</span>}
                            </div>
                            {item.note && (
                              <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">{item.note}</p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20 dark:hover:text-teal-300"
                                title="打开购买链接"
                                aria-label={`打开 ${item.name} 的购买链接`}
                              >
                                <ExternalLink size={16} />
                              </a>
                            )}
                            {!batchMode && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => purchaseItem(item)}
                                  disabled={isPurchasing || item.status === 'purchased'}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 transition hover:bg-green-50 disabled:opacity-40 dark:text-green-400 dark:hover:bg-green-900/20"
                                  title="标记已购买"
                                  aria-label={`标记 ${item.name} 已购买`}
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEdit(item)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                  title="编辑"
                                  aria-label={`编辑 ${item.name}`}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                  title="删除"
                                  aria-label={`删除 ${item.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700/60 dark:bg-gray-800">
        <div className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 text-xs font-medium dark:bg-gray-900">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              className={`rounded-md px-2 py-2 transition ${
                view === tab.key
                  ? 'bg-white text-teal-700 shadow-sm dark:bg-gray-700 dark:text-teal-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-900"
            placeholder="搜索物品名称或备注"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select
            value={filters.category_id}
            onChange={(event) => onFiltersChange({ category_id: event.target.value })}
            className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900"
            aria-label="按分类筛选"
          >
            <option value="">全部分类</option>
            {categoryOptions.map(({ category, label }) => (
              <option key={category.id} value={category.id}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) => onFiltersChange({ status: event.target.value as ItemFilters['status'] })}
            className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900"
            aria-label="按状态筛选"
          >
            <option value="pending">待购买</option>
            <option value="purchased">已购买</option>
            <option value="cancelled">已取消</option>
            <option value="all">全部状态</option>
          </select>

          <select
            value={filters.priority}
            onChange={(event) => onFiltersChange({ priority: event.target.value as ItemFilters['priority'] })}
            className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900"
            aria-label="按优先级筛选"
          >
            <option value="all">全部优先级</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>

          <select
            value={filters.store}
            onChange={(event) => onFiltersChange({ store: event.target.value })}
            className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-900"
            aria-label="按商店筛选"
          >
            <option value="">全部商店</option>
            {storeOptions.map((store) => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className="col-span-2 rounded-lg bg-gray-100 px-2 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:col-span-1"
          >
            清空筛选
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>
          📋 {statusLabels[filters.status]} · {items.length} 件
        </span>
        <button
          type="button"
          onClick={toggleBatchMode}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            batchMode
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 shadow-sm hover:text-teal-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          <ListChecks size={15} />
          {batchMode ? '退出多选' : '多选模式'}
        </button>
      </div>

      {batchMode && items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
          <span>已选 {selectedCount} 件</span>
          <button type="button" onClick={toggleSelectAll} className="font-medium">
            {allVisibleSelected ? '取消全选' : '全选'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {body()}

      {batchMode && (
        <div className="fixed inset-x-0 bottom-16 z-50 px-4 pb-3">
          <div className="mx-auto max-w-2xl rounded-xl border border-gray-100 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-xs text-gray-500 dark:text-gray-400">已选 {selectedCount} 件</span>
              <button
                type="button"
                onClick={() => setBatchConfirm('purchase')}
                disabled={selectedCount === 0 || pendingAction?.type === 'batch'}
                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                批量标记已购买
              </button>
              <button
                type="button"
                onClick={() => setBatchConfirm('delete')}
                disabled={selectedCount === 0 || pendingAction?.type === 'batch'}
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                批量删除
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs space-y-4 rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                确定删除这个物品吗？
              </p>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="关闭"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={deleteItem}
                disabled={pendingAction?.type === 'delete'}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm text-white disabled:opacity-50"
              >
                {pendingAction?.type === 'delete' ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {batchConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs space-y-4 rounded-lg bg-white p-5 shadow-xl dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                {batchConfirm === 'purchase'
                  ? `确定将已选 ${selectedCount} 件标记为已购买吗？`
                  : `确定删除已选 ${selectedCount} 件物品吗？此操作不可撤销。`}
              </p>
              <button
                type="button"
                onClick={() => setBatchConfirm(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="关闭"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBatchConfirm(null)}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={runBatchAction}
                disabled={pendingAction?.type === 'batch'}
                className={`flex-1 rounded-lg py-2 text-sm text-white disabled:opacity-50 ${
                  batchConfirm === 'purchase' ? 'bg-green-600' : 'bg-red-500'
                }`}
              >
                {pendingAction?.type === 'batch' ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
