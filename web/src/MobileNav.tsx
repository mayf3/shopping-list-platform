import type { Page } from './App';

type Props = {
  page: Page;
  onChange: (page: Page) => void;
};

const tabs: { key: Page; icon: string; label: string }[] = [
  { key: 'list', icon: '📋', label: '清单' },
  { key: 'history', icon: '🕐', label: '历史' },
  { key: 'dashboard', icon: '💰', label: '预算' },
  { key: 'settings', icon: '⚙️', label: '设置' }
];

export function MobileNav({ page, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-100 dark:border-gray-800 safe-bottom">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 flex flex-col items-center py-2 transition-colors ${
              page === tab.key
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
