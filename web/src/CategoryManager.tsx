import { useState } from 'react';
import type { Category } from './types';
import { api, ApiError } from './api';

type Props = {
  token: string;
  categories: Category[];
  onRefresh: () => void;
};

export function CategoryManager({ token, categories, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [parentId, setParentId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const topCategories = categories.filter((c) => c.parent_id === null);
  const subCategories = categories.filter((c) => c.parent_id !== null);

  const openCreate = () => {
    setEditId(null);
    setName('');
    setIcon('📦');
    setParentId('');
    setError('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setParentId(cat.parent_id ? String(cat.parent_id) : '');
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('请输入分类名称');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        icon: icon.trim() || '📦',
        parent_id: parentId ? Number(parentId) : null,
        sort_order: 999
      };

      if (editId) {
        await api.updateCategory(token, editId, payload);
      } else {
        await api.createCategory(token, payload);
      }
      setShowForm(false);
      onRefresh();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteCategory(token, id);
      setConfirmDeleteId(null);
      onRefresh();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('删除失败');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
          📂 分类管理
        </h3>
        <button
          onClick={openCreate}
          className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition"
        >
          + 新增
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="space-y-1">
        {topCategories.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
              <span>{cat.icon}</span>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{cat.name}</span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={() => openEdit(cat)}
                  className="text-xs text-gray-400 hover:text-teal-600 px-1"
                >
                  编辑
                </button>
                <button
                  onClick={() => setConfirmDeleteId(cat.id)}
                  className="text-xs text-gray-400 hover:text-red-500 px-1"
                >
                  删除
                </button>
              </div>
            </div>

            {/* Subcategories */}
            {subCategories
              .filter((sc) => sc.parent_id === cat.id)
              .map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center gap-2 py-1.5 pl-8 pr-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
                >
                  <span className="text-sm">{sc.icon}</span>
                  <span className="flex-1 text-sm text-gray-500 dark:text-gray-300">{sc.name}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={() => openEdit(sc)}
                      className="text-xs text-gray-400 hover:text-teal-600 px-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(sc.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-1"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-xs shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {editId ? '编辑分类' : '新增分类'}
            </h3>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">图标</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="📦"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="分类名称"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                父分类（留空为顶级）
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">无（顶级分类）</option>
                {topCategories
                  .filter((c) => c.id !== editId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-sm disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-xs shadow-xl space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-200">确定删除该分类吗？</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
