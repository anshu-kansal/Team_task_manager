import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-gray-300 dark:border-dark-border',
        'bg-white dark:bg-dark-card px-3 py-2 text-sm',
        'text-gray-900 dark:text-dark-text',
        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-150',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';
