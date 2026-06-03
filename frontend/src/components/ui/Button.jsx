import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({ className, variant = 'default', size = 'default', loading = false, children, disabled, ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-card disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    default: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md',
    destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm hover:shadow-md',
    outline: 'border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-200',
    secondary: 'bg-gray-100 dark:bg-surface-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-surface-700',
    ghost: 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300',
    link: 'underline-offset-4 hover:underline text-primary-600 dark:text-primary-400',
    success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-sm hover:shadow-md',
  };

  const sizes = {
    xs: 'h-7 px-2.5 text-xs rounded-md',
    sm: 'h-8 px-3 text-xs rounded-md',
    default: 'h-9 px-4',
    lg: 'h-10 px-6',
    icon: 'h-9 w-9',
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = 'Button';
