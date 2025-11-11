"use client";

import { Button } from '@/components/ui/Button';
import { Check, Archive, Trash2 } from 'lucide-react';

export default function BulkActionsBar({
  count,
  onClear,
  onMarkRead,
  onArchive,
}: {
  count: number;
  onClear: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky top-16 z-10 mb-4 flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="text-sm">
        <span className="font-medium">{count}</span> selected
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onMarkRead}>
          <Check className="mr-2 h-4 w-4" /> Mark read
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive}>
          <Archive className="mr-2 h-4 w-4" /> Archive
        </Button>
        <Button variant="destructive" size="sm" onClick={onClear}>
          <Trash2 className="mr-2 h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
