"use client";

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Mail } from 'lucide-react';
import SearchBar from '@/components/email/SearchBar';
import BulkActionsBar from '@/components/email/BulkActionsBar';
import EmailListItem from '@/components/email/EmailListItem';
import { useToast } from '@/components/ui/ToastProvider';

export default function EmailsClient({ initialEmails }: { initialEmails: any[] }) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [query, setQuery] = React.useState('');
  const { showToast } = useToast();

  const emails = React.useMemo(() => {
    if (!query) return initialEmails;
    const q = query.toLowerCase();
    return initialEmails.filter((e) =>
      [e.subject, e.snippet, e.from_name, e.from_email].some((v: string | null | undefined) =>
        (v || '').toLowerCase().includes(q)
      )
    );
  }, [initialEmails, query]);

  const selectedCount = React.useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  function toggle(id: string, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  function clearSelection() {
    setSelected({});
  }

  function selectAllPage() {
    const next: Record<string, boolean> = { ...selected };
    emails.forEach((e: any) => { next[e.id] = true; });
    setSelected(next);
  }

  async function bulk(op: 'markRead' | 'archive') {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    try {
      const res = await fetch('/api/emails/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, ids }),
      });
      if (!res.ok) throw new Error('Bulk action failed');
      showToast({ type: 'success', message: op === 'archive' ? 'Archived' : 'Marked read' });
      clearSelection();
    } catch (e: any) {
      showToast({ type: 'error', message: e?.message || 'Bulk action failed' });
    }
  }

  if (emails.length === 0) {
    return (
      <Card className="dark:border-gray-800 dark:bg-gray-950">
        <CardContent className="py-12">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No emails found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters or sync your Gmail account
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <SearchBar value={query} onChange={setQuery} />
        <button
          onClick={selectAllPage}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          Select page
        </button>
      </div>
      <BulkActionsBar
        count={selectedCount}
        onClear={clearSelection}
        onMarkRead={() => bulk('markRead')}
        onArchive={() => bulk('archive')}
      />
      {emails.map((email: any) => (
        <EmailListItem
          key={email.id}
          email={email}
          selected={!!selected[email.id]}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}
