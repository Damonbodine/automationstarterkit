'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type AgentType = 'task-extractor' | 'document-summarizer' | 'sow-generator';
export type JobStatus = 'idle' | 'queuing' | 'processing' | 'completed' | 'error';

export function useAgentJob(emailId: string, agentType: AgentType) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [showModal, setShowModal] = useState(false);

  const startJob = useCallback(async () => {
    try {
      setIsRunning(true);
      setShowModal(true);
      setStatus('queuing');

      const response = await fetch('/api/agents/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          type: agentType,
        }),
      });

      if (!response.ok) throw new Error('Failed to queue job');

      const data = await response.json();
      setStatus('processing');

      // Start polling
      pollForCompletion();
    } catch (error) {
      console.error('Error starting job:', error);
      setStatus('error');
      setTimeout(() => {
        setShowModal(false);
        setIsRunning(false);
      }, 2000);
    }
  }, [emailId, agentType]);

  const pollForCompletion = useCallback(() => {
    const maxAttempts = 60;
    let attempts = 0;
    let lastCheckTime = Date.now();

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/agents/logs/recent?limit=20&t=${Date.now()}`);
        const data = await response.json();

        // Look for a recent completed job (within last 2 minutes)
        const completedJob = data.logs?.find(
          (log: any) =>
            log.agent_type === agentType &&
            log.email_id === emailId &&
            log.success === true &&
            new Date(log.created_at).getTime() > lastCheckTime - 120000 // 2 min window
        );

        if (completedJob) {
          clearInterval(interval);
          setStatus('completed');

          // Show success state, then refresh
          setTimeout(() => {
            setShowModal(false);
            setIsRunning(false);
            router.refresh();
          }, 1500);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStatus('error');
          setTimeout(() => {
            setShowModal(false);
            setIsRunning(false);
          }, 2000);
        }
      } catch (error) {
        console.error('Error polling:', error);
      }
    }, 1000);
  }, [emailId, agentType, router]);

  return {
    isRunning,
    status,
    showModal,
    startJob,
    closeModal: () => setShowModal(false),
  };
}
