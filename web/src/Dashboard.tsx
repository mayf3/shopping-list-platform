import type { Summary } from './types';

type Props = {
  summary: Summary | null;
  loading: boolean;
};

export function Dashboard({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mr-2" />
        加载中...
      </div>
    );
  }

  const budgetPercent = summary.monthly_budget > 0
    ? Math.min((summary.spent_this_month / summary.monthly_budget) * 100, 100)
    : 0;

  const budgetColor =
    budgetPercent >= 90
      ? 'bg-red-500'
      : budgetPercent >= 70
      ? 'bg-yellow-500'
      : 'bg-teal-500';

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
        💰 预算概览
      </h2>

      {/* Budget card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {summary.month} 月预算
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ¥{summary.spent_this_month.toFixed(0)} / ¥{summary.monthly_budget.toFixed(0)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${budgetColor}`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-sm">
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs">剩余预算</p>
            <p className="font-bold text-teal-600 dark:text-teal-400">
              ¥{summary.remaining_budget.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 dark:text-gray-500 text-xs">已用</p>
            <p className="font-bold text-gray-700 dark:text-gray-200">
              {budgetPercent.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-4 text-center">
          <div className="text-2xl mb-1">📋</div>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {summary.pending_count}
          </p>
          <p className="text-[10px] text-gray-400">待购买</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-4 text-center">
          <div className="text-2xl mb-1">✅</div>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {summary.purchased_this_month_count}
          </p>
          <p className="text-[10px] text-gray-400">已购买</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-4 text-center">
          <div className="text-2xl mb-1">💵</div>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
            ¥{summary.pending_estimated_total.toFixed(0)}
          </p>
          <p className="text-[10px] text-gray-400">预估总额</p>
        </div>
      </div>

      {/* Recent purchases */}
      {summary.recent_purchased.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            最近购买
          </h3>
          <div className="space-y-2">
            {summary.recent_purchased.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                <span className="text-lg">{item.category_icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {item.purchased_at ? new Date(item.purchased_at).toLocaleDateString('zh-CN') : ''}
                  </p>
                </div>
                {item.actual_price != null && (
                  <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                    ¥{item.actual_price.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
