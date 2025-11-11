"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';

type QStats = { waiting: number; active: number; completed: number; failed: number; delayed: number };

export default function QueueStatusWidget() {
  const [stats, setStats] = React.useState<QStats | null>(null);
  const [last, setLast] = React.useState<QStats | null>(null);
  const router = useRouter();

  async function load() {
    try {
      const res = await fetch('/api/queues/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const emailSync = data?.emailSync as QStats;
      setLast(stats);
      setStats(emailSync);
      if (
        last && emailSync &&
        (last.active !== emailSync.active || last.completed !== emailSync.completed)
      ) {
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stats;
  return (
    <div
      aria-live="polite"
      className="inline-flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      title="Email Sync Queue"
    >
      <span className="font-medium">Queue</span>
      <span>W:{s?.waiting ?? 0}</span>
      <span className="text-blue-600">A:{s?.active ?? 0}</span>
      <span className="text-green-600">C:{s?.completed ?? 0}</span>
      <span className="text-red-600">F:{s?.failed ?? 0}</span>
    </div>
  );
}

