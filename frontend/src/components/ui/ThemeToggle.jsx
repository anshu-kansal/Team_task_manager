import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useStore();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative rounded-lg p-2 text-surface-500 hover:text-gray-900 hover:bg-surface-50",
        "dark:text-surface-400 dark:hover:text-white dark:hover:bg-dark-hover",
        "transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50",
        className
      )}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      <div className="relative h-5 w-5 overflow-hidden">
        {/* Sun Icon */}
        <Sun
          className={cn(
            "absolute inset-0 h-5 w-5 transition-transform duration-300 ease-out",
            theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
          )}
        />
        {/* Moon Icon */}
        <Moon
          className={cn(
            "absolute inset-0 h-5 w-5 transition-transform duration-300 ease-out",
            theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
          )}
        />
      </div>
    </button>
  );
}
