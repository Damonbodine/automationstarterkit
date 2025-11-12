"use client";

import React from 'react';

type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, durationMs: 3500, type: 'info', ...t };
    setToasts((prev) => [...prev, toast]);
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, toast.durationMs);
    return () => clearTimeout(timeout);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Container */}
      <div className="fixed inset-x-0 top-14 z-[100] flex w-full justify-center pointer-events-none">
        <div className="flex w-full max-w-md flex-col gap-2 px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={[
                'pointer-events-auto rounded-md border px-3 py-2 shadow-sm transition-all',
                'bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
                t.type === 'success' && 'border-green-200 dark:border-green-700',
                t.type === 'error' && 'border-red-200 dark:border-red-700',
                t.type === 'info' && 'border-blue-200 dark:border-blue-700',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  {t.title && (
                    <div className="text-sm font-medium mb-0.5">{t.title}</div>
                  )}
                  <div className="text-sm">{t.message}</div>
                </div>
                <button
                  className="ml-2 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  onClick={() => remove(t.id)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

