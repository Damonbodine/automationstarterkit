"use client";

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

export default function QuickActionsRow() {
  const { showToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      setOpen(false);
      setName('');
      setDesc('');
      showToast({ type: 'success', message: 'Project created' });
    } catch (e: any) {
      showToast({ type: 'error', message: e?.message || 'Could not create project' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => showToast({ type: 'info', message: 'Compose coming soon' })}>
        <Pencil className="mr-2 h-4 w-4" /> Compose
      </Button>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Create Project
      </Button>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-md border bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-1 text-lg font-semibold">New Project</h3>
            <p className="mb-4 text-sm text-gray-500">Name and describe your project.</p>
            <form onSubmit={createProject} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
                <Button type="submit" disabled={busy}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

