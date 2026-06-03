import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, className, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      <div className={cn(
        'relative z-50 w-full rounded-2xl bg-white dark:bg-dark-card',
        'shadow-float dark:shadow-dark-float',
        'border border-gray-200 dark:border-dark-border',
        'animate-scale-in',
        sizes[size],
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button 
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-hover dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}
