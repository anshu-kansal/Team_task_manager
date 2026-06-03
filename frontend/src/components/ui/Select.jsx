import React from 'react';
import { cn } from '../../lib/utils';

export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-gray-300 dark:border-dark-border',
        'bg-white dark:bg-dark-card px-3 py-2 text-sm',
        'text-gray-900 dark:text-dark-text',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-150',
        'appearance-none bg-no-repeat bg-right',
        // Custom dropdown arrow
        "bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")]",
        'bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] pr-8',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';
