"use client";

import { Bell, CheckCircle, XCircle } from 'lucide-react';
import * as React from 'react';

type Log = {
  id: string;
  agent_type: string;
  action: string;
  success: boolean | null;
  created_at: string | null;
};

export default function NotificationBell() {
  const [unread, setUnread] = React.useState<number>(0);
  const [open, setOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<Log[]>([]);
  const prevRef = React.useRef<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/agents/logs/recent', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data?.logs || []) as Log[];
      setLogs(list);
      const latestId = list[0]?.id || null;
      if (latestId && prevRef.current && latestId !== prevRef.current) {
        setUnread((c) => c + 1);
      }
      if (latestId) prevRef.current = latestId;
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          setUnread(0);
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
      >
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
        <Bell className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="px-3 py-2 font-medium">Recent Agent Activity</div>
          <div className="max-h-80 overflow-auto">
            {logs.length === 0 ? (
              <div className="px-3 py-6 text-center text-gray-500">No recent activity</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                  {l.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.agent_type}</div>
                    <div className="truncate text-xs text-gray-500">{l.action}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {l.created_at ? new Date(l.created_at).toLocaleTimeString() : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
