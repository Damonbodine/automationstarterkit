'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const getTimezones = (): string[] => {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      return (Intl as any).supportedValuesOf('timeZone') as string[];
    }
  } catch {
    // Fall back to empty array if method doesn't exist
  }
  return [];
};
const timezones = getTimezones();

export default function TimezonePreference({ initialTz }: { initialTz: string }) {
  const [tz, setTz] = useState(initialTz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/sync-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_config: { timezone: tz } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-900"
        value={tz}
        onChange={(e) => setTz(e.target.value)}
      >
        {(timezones.length ? timezones : ['UTC']).map((z) => (
          <option key={z} value={z}>{z}</option>
        ))}
      </select>
      <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : (saved ? 'Saved' : 'Save')}</Button>
    </div>
  );
}

