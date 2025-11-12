"use client";

import { Button } from '@/components/ui/Button';
import { Check, Archive, Trash2, Mail, Star, AlertOctagon, X } from 'lucide-react';

export default function BulkActionsBar({
  count,
  onClear,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onStar,
  onUnstar,
  onSpam,
}: {
  count: number;
  onClear: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStar: () => void;
  onUnstar: () => void;
  onSpam: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="text-sm">
        <span className="font-medium">{count}</span> selected
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onMarkRead}>
          <Check className="mr-1 h-4 w-4" /> Read
        </Button>
        <Button variant="secondary" size="sm" onClick={onMarkUnread}>
          <Mail className="mr-1 h-4 w-4" /> Unread
        </Button>
        <Button variant="secondary" size="sm" onClick={onStar}>
          <Star className="mr-1 h-4 w-4" /> Star
        </Button>
        <Button variant="secondary" size="sm" onClick={onUnstar}>
          <Star className="mr-1 h-4 w-4" /> Unstar
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive}>
          <Archive className="mr-1 h-4 w-4" /> Archive
        </Button>
        <Button variant="outline" size="sm" onClick={onSpam}>
          <AlertOctagon className="mr-1 h-4 w-4" /> Spam
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
