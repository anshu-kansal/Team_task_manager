import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Confirmation dialog for destructive actions (delete, remove, etc.)
 */
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Delete', variant = 'destructive', loading = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={cn(
        'relative z-50 w-full max-w-sm rounded-2xl bg-white dark:bg-dark-card p-6',
        'shadow-float dark:shadow-dark-float animate-scale-in',
        'border border-gray-200 dark:border-dark-border'
      )}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-hover dark:hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full mb-4',
            variant === 'destructive'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30'
          )}>
            <AlertTriangle className={cn(
              'h-6 w-6',
              variant === 'destructive'
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            )} />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {title || 'Are you sure?'}
          </h3>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {description}
            </p>
          )}

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={variant}
              className="flex-1"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
