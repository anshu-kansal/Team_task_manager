import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TOAST_STYLES = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300',
  info: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300',
};

const ICON_STYLES = {
  success: 'text-green-500 dark:text-green-400',
  error: 'text-red-500 dark:text-red-400',
  info: 'text-primary-500 dark:text-primary-400',
  warning: 'text-amber-500 dark:text-amber-400',
};

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const Icon = TOAST_ICONS[toast.type] || Info;

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 280);
  }, [toast.id, onDismiss]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(handleDismiss, 4000);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl border px-4 py-3 shadow-float dark:shadow-dark-float',
        TOAST_STYLES[toast.type] || TOAST_STYLES.info,
        exiting ? 'animate-toast-exit' : 'animate-toast-enter'
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', ICON_STYLES[toast.type])} />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
