import * as React from 'react';

export default function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  const fallback = (name || email || '?').toString().trim()[0]?.toUpperCase() || '?';
  return (
    <div
      className="inline-flex h-9 w-9 select-none items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500"
      title={email || undefined}
    >
      {fallback}
    </div>
  );
}

