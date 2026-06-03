import React, { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Lightweight tooltip component for icon buttons and other elements.
 */
export function Tooltip({ children, content, side = 'top', className }) {
  const [visible, setVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          className={cn(
            'absolute z-50 whitespace-nowrap',
            'rounded-md px-2.5 py-1.5 text-xs font-medium',
            'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
            'shadow-lg pointer-events-none animate-fade-in',
            positions[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
