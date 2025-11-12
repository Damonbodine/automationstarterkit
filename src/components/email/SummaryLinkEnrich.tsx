'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function SummaryLinkEnrich({ emailId, links }: { emailId: string; links: string[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(links.map(l => [l, true])));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!links.length) return null;

  async function enrich() {
    setLoading(true);
    setMessage(null);
    try {
      const payloadLinks = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
      const res = await fetch(`/api/emails/${emailId}/links/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: payloadLinks }),
      });
      const data = await res.json();
      if (data.enriched) setMessage('Weblinks understood. Summary updating.');
      else setMessage(data.reason || 'No weblinks processed.');
    } catch (e) {
      setMessage('Failed to fetch links.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-500">Detected links:</div>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <label key={l} className="inline-flex items-center gap-1 text-xs">
            <input type="checkbox" className="accent-blue-600" checked={!!selected[l]} onChange={(e) => setSelected({ ...selected, [l]: e.target.checked })} />
            <span className="max-w-[240px] truncate">{l}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={enrich} disabled={loading}>{loading ? 'Processing…' : 'Understand weblinks'}</Button>
        {message && <Badge variant="default">{message}</Badge>}
      </div>
    </div>
  );
}
