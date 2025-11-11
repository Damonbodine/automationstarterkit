"use client";

import Link from 'next/link';
import { CategoryBadge, PriorityBadge, SentimentBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

interface ItemProps {
  email: any; // relax typing to avoid blocking UI on DB type variance
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
}

export default function EmailListItem({ email, selected, onToggle }: ItemProps) {
  const classification = (Array.isArray(email.email_classifications)
    ? email.email_classifications[0]
    : email.email_classifications) as any | undefined;

  return (
    <div className="group relative">
      <label className="absolute left-2 top-1/2 z-10 -translate-y-1/2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggle(email.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </label>
      <Link href={`/emails/${email.id}`} className="block">
        <div className="pl-9">
          <div className="hover:shadow-md transition-shadow rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {!email.is_read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />}
                  <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                    {email.subject || '(No subject)'}
                  </h3>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  From: {email.from_name || email.from_email}
                </p>
                {email.snippet && (
                  <p className="mb-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{email.snippet}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {classification && (
                    <>
                      <CategoryBadge category={classification.category} />
                      <PriorityBadge priority={classification.priority} />
                      <SentimentBadge sentiment={classification.sentiment} />
                      {typeof classification.confidence_score === 'number' && (
                        <span className="inline-flex items-center rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                          {Math.round((classification.confidence_score || 0) * 100)}%
                        </span>
                      )}
                    </>
                  )}
                  {email.has_attachments && (
                    <span className="inline-flex items-center text-xs text-gray-500">📎 Attachments</span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-sm text-gray-500">{formatDate(email.received_at)}</div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
