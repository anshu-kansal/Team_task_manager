import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

/**
 * Reusable empty state component for "no data" displays.
 * Provides consistent icon + title + description + optional action.
 */
export function EmptyState({ icon: Icon, title, description, action, actionLabel, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border',
        'py-16 px-8 animate-fade-in',
        className
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-dark-hover mb-4">
          <Icon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <Button onClick={action} size="sm" className="gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
