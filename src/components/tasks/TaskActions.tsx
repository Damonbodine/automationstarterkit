'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface TaskActionsProps {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
}

export function TaskActions({ taskId, status }: TaskActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      router.refresh();
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {(status === 'pending' || status === null) && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? 'Completing...' : 'Complete'}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isLoading}
      >
        {isLoading ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}
