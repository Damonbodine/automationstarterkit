"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value: valueProp, defaultValue, onValueChange, children, className }: TabsProps) {
  const [value, setValue] = React.useState<string>(defaultValue || '');

  React.useEffect(() => {
    if (valueProp !== undefined) setValue(valueProp);
  }, [valueProp]);

  const ctx = React.useMemo(
    () => ({
      value,
      setValue: (v: string) => {
        setValue(v);
        onValueChange?.(v);
      },
    }),
    [value, onValueChange]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

const TabsContext = React.createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
  const selected = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        selected
          ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
      )}
      role="tab"
      aria-selected={selected}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used within Tabs');
  if (ctx.value !== value) return null;
  return <div className={cn('mt-4', className)}>{children}</div>;
}

