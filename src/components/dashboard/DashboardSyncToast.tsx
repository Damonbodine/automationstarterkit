"use client";

import * as React from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function DashboardSyncToast({ queued }: { queued: boolean }) {
  const { showToast } = useToast();
  React.useEffect(() => {
    if (queued) {
      showToast({ type: 'info', message: 'Email sync queued' });
    }
  }, [queued, showToast]);
  return null;
}

