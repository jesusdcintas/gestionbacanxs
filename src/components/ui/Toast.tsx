import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);

    window.setTimeout(() => {
      removeToast(id);
    }, 3600);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-100 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const isError = toast.variant === 'error';
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto border bg-surface p-4 transition-colors duration-150',
                isError ? 'border-danger' : 'border-accent',
              )}
              role="status"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  {isError ? (
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-text-primary">{toast.title}</p>
                    {toast.description ? <p className="mt-1 text-xs text-text-secondary">{toast.description}</p> : null}
                  </div>
                </div>
                <button
                  aria-label="Cerrar notificación"
                  className="text-text-secondary transition-colors hover:text-text-primary"
                  onClick={() => removeToast(toast.id)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider.');
  }

  return context;
}
