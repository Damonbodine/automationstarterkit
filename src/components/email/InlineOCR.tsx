'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface OCRText {
  documentId: string;
  filename: string;
  text: string;
}

export default function InlineOCR({ emailId }: { emailId: string }) {
  const [texts, setTexts] = useState<OCRText[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/emails/${emailId}/ocr`);
      const data = await res.json();
      setTexts(data.texts || []);
      setPending(data.pending || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Poll briefly if pending
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [emailId]);

  if (!texts.length && !pending.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Extracted Text
          {loading && <Badge variant="default">Refreshing</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {texts.map(t => (
          <div key={t.documentId}>
            <p className="text-xs text-gray-500 mb-1">{t.filename}</p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 max-h-64 overflow-auto border rounded p-3 bg-gray-50 dark:bg-gray-900">
              {t.text}
            </pre>
          </div>
        ))}
        {pending.length > 0 && (
          <div className="text-xs text-gray-500">{pending.length} attachment(s) processing…</div>
        )}
        <div>
          <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
        </div>
      </CardContent>
    </Card>
  );
}

