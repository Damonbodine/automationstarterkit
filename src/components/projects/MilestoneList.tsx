'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';

type Milestone = Database['public']['Tables']['milestones']['Row'];

interface MilestoneListProps {
  projectId: string;
  milestones: Milestone[];
}

export function MilestoneList({ projectId, milestones }: MilestoneListProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('create');

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone),
      });

      if (!response.ok) {
        throw new Error('Failed to create milestone');
      }

      setNewMilestone({ title: '', description: '', due_date: '' });
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating milestone:', error);
      alert('Failed to create milestone. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleComplete = async (milestoneId: string, currentStatus: string) => {
    setLoadingId(milestoneId);

    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating milestone:', error);
      alert('Failed to update milestone. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    setLoadingId(milestoneId);

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete milestone');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Failed to delete milestone. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="dark:border-gray-800 dark:bg-gray-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Milestones</CardTitle>
          <Button size="sm" onClick={() => setIsCreating(!isCreating)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Create Form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Milestone title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Milestone description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={newMilestone.due_date}
                onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loadingId === 'create'}>
                {loadingId === 'create' ? 'Creating...' : 'Create'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Milestones List */}
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-400">
            No milestones yet. Add your first milestone to track progress.
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <button
                  onClick={() => handleComplete(milestone.id, milestone.status || 'pending')}
                  disabled={loadingId === milestone.id}
                  className="flex-shrink-0 mt-0.5"
                >
                  {milestone.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-medium ${
                      milestone.status === 'completed'
                        ? 'text-gray-400 dark:text-gray-600 line-through'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {milestone.title}
                  </h4>
                  {milestone.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {milestone.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                    {milestone.completed_at && (
                      <span>Completed: {new Date(milestone.completed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(milestone.id)}
                  disabled={loadingId === milestone.id}
                  className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
