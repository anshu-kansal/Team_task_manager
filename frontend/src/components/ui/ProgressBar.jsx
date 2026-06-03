import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Animated progress bar with label and percentage display.
 */
export function ProgressBar({ value = 0, max = 100, label, showPercent = true, size = 'default', color = 'primary', className }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  const sizes = {
    sm: 'h-1.5',
    default: 'h-2.5',
    lg: 'h-4',
  };

  const colors = {
    primary: 'bg-gradient-to-r from-primary-500 to-indigo-600 dark:from-primary-600 dark:to-indigo-500',
    success: 'bg-gradient-to-r from-green-400 to-emerald-500 dark:from-green-500 dark:to-emerald-600',
    warning: 'bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {label}
            </span>
          )}
          {showPercent && (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {pct}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-100 dark:bg-surface-800 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            colors[color]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
