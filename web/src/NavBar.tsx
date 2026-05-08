import type { User } from './types';

type Props = {
  user: User;
  onLogout: () => void;
  dark: boolean;
  onToggleDark: () => void;
};

export function NavBar({ user, onLogout, dark, onToggleDark }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800 safe-top">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">购物清单</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDark}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="切换暗色模式"
          >
            {dark ? '☀️' : '🌙'}
          </button>

          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
            {user.username}
          </span>

          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
