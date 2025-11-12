'use client';

import { useState } from 'react';

export default function DevPage() {
  const [log, setLog] = useState<string>('');
  const [limit, setLimit] = useState<number>(25);
  const [emailId, setEmailId] = useState<string>('');
  const [agentType, setAgentType] = useState<'sow-generator'|'task-extractor'|'document-summarizer'>('task-extractor');

  const appendLog = (line: string) => setLog((l) => `${new Date().toLocaleTimeString()} ${line}\n` + l);

  const queueFullSync = async () => {
    const res = await fetch('/api/emails/sync', { method: 'POST', body: JSON.stringify({ fullSync: true }) });
    const data = await res.json();
    appendLog(`Sync queued: ${res.status} ${JSON.stringify(data)}`);
  };

  const classifyBatch = async () => {
    const res = await fetch('/api/emails/classify/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit }) });
    const data = await res.json();
    appendLog(`Classify queued: ${res.status} ${JSON.stringify(data)}`);
  };

  const fetchMetrics = async () => {
    const res = await fetch('/api/classification/metrics');
    const data = await res.json();
    appendLog(`Metrics: ${res.status} ${JSON.stringify(data)}`);
  };

  const fetchRecent = async () => {
    const res = await fetch('/api/classification/recent');
    const data = await res.json();
    appendLog(`Recent: ${res.status} ${JSON.stringify(data)}`);
  };

  const enqueueAgent = async () => {
    if (!emailId) return appendLog('Enter an emailId to test agents.');
    const res = await fetch('/api/agents/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailId, type: agentType }) });
    const data = await res.json();
    appendLog(`Agent queued: ${res.status} ${JSON.stringify(data)}`);
  };

  const listEmails = async () => {
    const res = await fetch('/api/emails?limit=10');
    const data = await res.json();
    appendLog(`Emails: ${res.status} ${JSON.stringify(data)}`);
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Dev Console</h1>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={queueFullSync}>Queue Full Email Sync</button>
        </div>

        <div className="flex items-center gap-2">
          <input type="number" className="border px-2 py-1 rounded w-24" value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '0', 10))} />
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={classifyBatch}>Classify Batch</button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={fetchMetrics}>Fetch Metrics</button>
          <button className="px-3 py-2 bg-purple-600 text-white rounded" onClick={fetchRecent}>Fetch Recent</button>
        </div>

        <div className="flex items-center gap-2">
          <input type="text" className="border px-2 py-1 rounded flex-1" placeholder="emailId" value={emailId} onChange={(e) => setEmailId(e.target.value)} />
          <select className="border px-2 py-1 rounded" value={agentType} onChange={(e) => setAgentType(e.target.value as any)}>
            <option value="task-extractor">task-extractor</option>
            <option value="document-summarizer">document-summarizer</option>
            <option value="sow-generator">sow-generator</option>
          </select>
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={enqueueAgent}>Enqueue Agent</button>
          <button className="px-3 py-2 bg-gray-200 rounded" onClick={listEmails}>List Emails</button>
        </div>

        <pre className="bg-gray-100 p-3 rounded min-h-[200px] whitespace-pre-wrap">{log}</pre>
      </div>
    </main>
  );
}
