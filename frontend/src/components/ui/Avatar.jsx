import React from 'react';
import { cn } from '../../lib/utils';

export function Avatar({ src, fallback, className, ...props }) {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800", className)} {...props}>
      {src ? (
        <img className="aspect-square h-full w-full object-cover" src={src} alt={fallback} />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 font-medium">
          {fallback}
        </div>
      )}
    </div>
  );
}
