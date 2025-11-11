"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, PriorityBadge, SentimentBadge, Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Check, MoreVertical, Play } from 'lucide-react';
import * as React from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type Email = any;

export default function PriorityQueueCard({ emails }: { emails: Email[] }) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function markRead(id: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/emails/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'markRead', ids: [id] }),
      });
      if (!res.ok) throw new Error('Failed to mark read');
      showToast({ type: 'success', message: 'Marked as read' });
    } catch (e: any) {
      showToast({ type: 'error', message: e?.message || 'Action failed' });
    } finally {
      setBusyId(null);
    }
  }

  async function runAgent(id: string, type: 'task-extractor' | 'document-summarizer' | 'sow-generator') {
    setBusyId(id);
    try {
      const res = await fetch('/api/agents/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: id, type }),
      });
      if (!res.ok) throw new Error('Failed to queue agent');
      showToast({ type: 'success', message: 'Agent started' });
    } catch (e: any) {
      showToast({ type: 'error', message: e?.message || 'Agent failed' });
    } finally {
      setBusyId(null);
    }
  }

  const hasEmails = emails && emails.length > 0;

  return (
    <Card className="mb-8 dark:border-gray-800 dark:bg-gray-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Priority Queue</CardTitle>
            <CardDescription>Top urgent and high-priority emails</CardDescription>
          </div>
          <Link
            href="/emails?priority=urgent"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View filters →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!hasEmails ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            No urgent or high priority emails right now.
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email: any) => {
              const c = Array.isArray(email.email_classifications)
                ? email.email_classifications[0]
                : email.email_classifications;
              const confidence = Math.round(((c?.confidence_score || 0) * 100));
              return (
                <div key={email.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 dark:border-gray-800">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!email.is_read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                      <Link href={`/emails/${email.id}`} className="truncate font-medium hover:underline">
                        {email.subject || '(No subject)'}
                      </Link>
                    </div>
                    <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(email.received_at)}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {c && (
                        <>
                          <CategoryBadge category={c.category} />
                          <PriorityBadge priority={c.priority} />
                          <SentimentBadge sentiment={c.sentiment} />
                          <Badge variant="default">{confidence}%</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    <Button size="sm" variant="secondary" onClick={() => markRead(email.id)} disabled={busyId === email.id}>
                      <Check className="mr-2 h-4 w-4" /> Read
                    </Button>
                    <div className="relative">
                      <details className="group">
                        <summary className="list-none">
                          <Button size="sm" variant="outline" disabled={busyId === email.id}>
                            <Play className="mr-2 h-4 w-4" /> Run Agent
                          </Button>
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white p-1 text-sm shadow-md dark:border-gray-800 dark:bg-gray-900">
                          <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => runAgent(email.id, 'task-extractor')}>Task Extractor</button>
                          <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => runAgent(email.id, 'document-summarizer')}>Summarizer</button>
                          <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => runAgent(email.id, 'sow-generator')}>SOW Generator</button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

