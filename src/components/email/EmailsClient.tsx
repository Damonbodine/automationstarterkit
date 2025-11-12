"use client";

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Mail, RefreshCw } from 'lucide-react';
import SearchBar from '@/components/email/SearchBar';
import BulkActionsBar from '@/components/email/BulkActionsBar';
import EmailListItem from '@/components/email/EmailListItem';
import SelectAllDropdown from '@/components/email/SelectAllDropdown';
import { useToast } from '@/components/ui/ToastProvider';
import { useRouter } from 'next/navigation';

export default function EmailsClient({ initialEmails }: { initialEmails: any[] }) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [query, setQuery] = React.useState('');
  const [emails, setEmails] = React.useState(initialEmails);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const filteredEmails = React.useMemo(() => {
    if (!query) return emails;
    const q = query.toLowerCase();
    return emails.filter((e: any) =>
      [e.subject, e.snippet, e.from_name, e.from_email].some((v: string | null | undefined) =>
        (v || '').toLowerCase().includes(q)
      )
    );
  }, [emails, query]);

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

  function selectAll() {
    const next: Record<string, boolean> = {};
    filteredEmails.forEach((e: any) => { next[e.id] = true; });
    setSelected(next);
  }

  function selectNone() {
    setSelected({});
  }

  function selectRead() {
    const next: Record<string, boolean> = {};
    filteredEmails.forEach((e: any) => {
      if (e.is_read) next[e.id] = true;
    });
    setSelected(next);
  }

  function selectUnread() {
    const next: Record<string, boolean> = {};
    filteredEmails.forEach((e: any) => {
      if (!e.is_read) next[e.id] = true;
    });
    setSelected(next);
  }

  function selectStarred() {
    const next: Record<string, boolean> = {};
    filteredEmails.forEach((e: any) => {
      if (e.is_starred) next[e.id] = true;
    });
    setSelected(next);
  }

  function selectUnstarred() {
    const next: Record<string, boolean> = {};
    filteredEmails.forEach((e: any) => {
      if (!e.is_starred) next[e.id] = true;
    });
    setSelected(next);
  }

  async function handleStarToggle(id: string, starred: boolean) {
    // Optimistic update
    setEmails((prev) =>
      prev.map((e: any) => (e.id === id ? { ...e, is_starred: starred } : e))
    );

    try {
      const res = await fetch('/api/emails/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: starred ? 'star' : 'unstar', ids: [id] }),
      });
      if (!res.ok) throw new Error('Star toggle failed');
    } catch (e: any) {
      // Revert on error
      setEmails((prev) =>
        prev.map((em: any) => (em.id === id ? { ...em, is_starred: !starred } : em))
      );
      showToast({ type: 'error', message: e?.message || 'Star toggle failed' });
    }
  }

  async function bulk(op: 'markRead' | 'markUnread' | 'archive' | 'delete' | 'spam' | 'star' | 'unstar') {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;

    // Optimistic updates
    if (op === 'markRead') {
      setEmails((prev) => prev.map((e: any) => (ids.includes(e.id) ? { ...e, is_read: true } : e)));
    } else if (op === 'markUnread') {
      setEmails((prev) => prev.map((e: any) => (ids.includes(e.id) ? { ...e, is_read: false } : e)));
    } else if (op === 'star') {
      setEmails((prev) => prev.map((e: any) => (ids.includes(e.id) ? { ...e, is_starred: true } : e)));
    } else if (op === 'unstar') {
      setEmails((prev) => prev.map((e: any) => (ids.includes(e.id) ? { ...e, is_starred: false } : e)));
    } else if (op === 'archive' || op === 'delete' || op === 'spam') {
      // Remove from view for archive/delete/spam
      setEmails((prev) => prev.filter((e: any) => !ids.includes(e.id)));
    }

    try {
      const res = await fetch('/api/emails/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, ids }),
      });
      if (!res.ok) throw new Error('Bulk action failed');

      const messages: Record<string, string> = {
        markRead: 'Marked as read',
        markUnread: 'Marked as unread',
        archive: 'Archived',
        delete: 'Moved to trash',
        spam: 'Marked as spam',
        star: 'Starred',
        unstar: 'Unstarred',
      };

      showToast({ type: 'success', message: messages[op] || 'Action completed' });
      clearSelection();
    } catch (e: any) {
      // Revert on error - refresh from server
      router.refresh();
      showToast({ type: 'error', message: e?.message || 'Bulk action failed' });
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      router.refresh();
      showToast({ type: 'success', message: 'Emails refreshed' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Refresh failed' });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }

  if (filteredEmails.length === 0) {
    return (
      <Card className="dark:border-gray-800 dark:bg-gray-950">
        <CardContent className="py-12">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No emails found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {query ? 'No emails match your search' : 'Try adjusting your filters or sync your Gmail account'}
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
        <div className="flex items-center gap-2">
          <SelectAllDropdown
            onSelectAll={selectAll}
            onSelectNone={selectNone}
            onSelectRead={selectRead}
            onSelectUnread={selectUnread}
            onSelectStarred={selectStarred}
            onSelectUnstarred={selectUnstarred}
            selectedCount={selectedCount}
            totalCount={filteredEmails.length}
          />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <BulkActionsBar
        count={selectedCount}
        onClear={clearSelection}
        onMarkRead={() => bulk('markRead')}
        onMarkUnread={() => bulk('markUnread')}
        onArchive={() => bulk('archive')}
        onDelete={() => bulk('delete')}
        onStar={() => bulk('star')}
        onUnstar={() => bulk('unstar')}
        onSpam={() => bulk('spam')}
      />
      {filteredEmails.map((email: any) => (
        <EmailListItem
          key={email.id}
          email={email}
          selected={!!selected[email.id]}
          onToggle={toggle}
          onStarToggle={handleStarToggle}
        />
      ))}
    </div>
  );
}
