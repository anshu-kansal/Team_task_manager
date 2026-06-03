import React from 'react';
import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-lg border border-gray-300 dark:border-dark-border',
        'bg-white dark:bg-dark-card px-3 py-2.5 text-sm',
        'text-gray-900 dark:text-dark-text',
        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-150 resize-none',
        'min-h-[80px]',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
