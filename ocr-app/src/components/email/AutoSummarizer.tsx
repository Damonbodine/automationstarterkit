'use client';

import { useEffect } from 'react';
import { useAgentJob } from '@/hooks/useAgentJob';
import AgentJobModal from './AgentJobModal';

interface AutoSummarizerProps {
  emailId: string;
  hasSummary: boolean;
  wordCount?: number;
}

export default function AutoSummarizer({ emailId, hasSummary, wordCount = 0 }: AutoSummarizerProps) {
  const job = useAgentJob(emailId, 'document-summarizer');

  // Auto-trigger summary generation if email is long enough and doesn't have one
  useEffect(() => {
    if (!hasSummary && wordCount > 200 && !job.isRunning) {
      job.startJob();
    }
  }, [hasSummary, wordCount, job]);

  return (
    <AgentJobModal
      isOpen={job.showModal}
      status={job.status}
      agentType="document-summarizer"
    />
  );
}
