"use client";

import * as React from 'react';
import { Button } from '@/components/ui/Button';

type AgentKey = 'task-extractor' | 'document-summarizer' | 'sow-generator';

const AGENTS: { key: AgentKey; name: string; desc: string }[] = [
  { key: 'task-extractor', name: 'Task Extractor', desc: 'Parses emails to create tasks with priorities and due dates.' },
  { key: 'document-summarizer', name: 'Document Summarizer', desc: 'Summarizes long emails into concise points.' },
  { key: 'sow-generator', name: 'SOW Generator', desc: 'Drafts a scope of work for client request emails.' },
];

function getPref(key: AgentKey): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(`agent:${key}:enabled`);
  return raw === null ? true : raw === 'true';
}

function setPref(key: AgentKey, value: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`agent:${key}:enabled`, String(value));
}

export default function AgentsClient() {
  const [enabled, setEnabled] = React.useState<Record<AgentKey, boolean>>({
    'task-extractor': true,
    'document-summarizer': true,
    'sow-generator': true,
  });

  React.useEffect(() => {
    setEnabled({
      'task-extractor': getPref('task-extractor'),
      'document-summarizer': getPref('document-summarizer'),
      'sow-generator': getPref('sow-generator'),
    });
  }, []);

  function toggle(key: AgentKey) {
    setEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] } as Record<AgentKey, boolean>;
      setPref(key, next[key]);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {AGENTS.map((a) => (
        <div key={a.key} className="flex items-start justify-between rounded-md border p-3 dark:border-gray-800">
          <div className="pr-3">
            <div className="font-medium">{a.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!enabled[a.key]}
              onChange={() => toggle(a.key)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:bg-gray-700"></div>
          </label>
        </div>
      ))}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Preferences are stored locally for now. Server sync coming soon.
      </div>
    </div>
  );
}

