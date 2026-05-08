import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import type { Category, Item } from './types';

type Props = {
  items: Item[];
  categories: Category[];
  loading: boolean;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => Promise<void>;
  onPurchase: (id: number, actualPrice: number | null, store?: string | null) => Promise<void>;
};

type Group = {
  name: string;
  icon: string;
  items: Item[];
};

export function ItemList({ items, loading, onEdit, onDelete, onPurchase }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'purchase'; id: number } | null>(null);
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    const grouped = new Map<string, Group>();

    for (const item of items) {
      const name = item.group_name || '其他';
      const group = grouped.get(name);
      if (group) {
        group.items.push(item);
      } else {
        grouped.set(name, {
          name,
          icon: item.group_icon || '📦',
          items: [item]
        });
      }
    }

    return Array.from(grouped.values());
  }, [items]);

  const priorityLabel = (priority: Item['priority']) => {
    if (priority === 'high') {
      return (
        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600 dark:bg-red-900/40 dark:text-red-300">
          紧急
        </span>
      );
    }

    if (priority === 'medium') {
      return (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          一般
        </span>
      );
    }

    return (
      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-300">
        低
      </span>
    );
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
        <div className="mb-3 text-4xl">✨</div>
        <p className="text-sm">购物清单是空的</p>
        <p className="mt-1 text-xs">点击右下角按钮添加物品</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>📋 {items.length} 件待买</span>
        <span>按分类分组</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {groups.map((group) => {
        const isCollapsed = collapsed[group.name] ?? false;

        return (
          <section key={group.name} className="space-y-2">
            <button
              type="button"
              onClick={() => setCollapsed((state) => ({ ...state, [group.name]: !isCollapsed }))}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm font-semibold text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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

                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-700/60 dark:bg-gray-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                              {item.name}
                            </span>
                            {priorityLabel(item.priority)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                            <span>
                              {item.quantity}
                              {item.unit}
                            </span>
                            <span>{item.category_icon} {item.category_name}</span>
                            {item.estimated_price != null && <span>约 ¥{item.estimated_price.toFixed(2)}</span>}
                            {item.store && <span>📍{item.store}</span>}
                          </div>
                          {item.note && (
                            <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
                              {item.note}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => purchaseItem(item)}
                            disabled={isPurchasing}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 transition hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
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
    </div>
  );
}
