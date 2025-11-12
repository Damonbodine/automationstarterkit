'use client';

import { useEffect } from 'react';
import { useAgentJob } from '@/hooks/useAgentJob';
import AgentJobModal from './AgentJobModal';

interface AutoSummarizerProps {
  emailId: string;
  hasSummary: boolean;
  wordCount?: number;
  attachmentsCount?: number;
}

export default function AutoSummarizer({ emailId, hasSummary, wordCount = 0, attachmentsCount = 0 }: AutoSummarizerProps) {
  const job = useAgentJob(emailId, 'document-summarizer');

  // Auto-trigger summary generation if email is long enough and doesn't have one
  useEffect(() => {
    const shouldSummarize = !hasSummary && !job.isRunning && (wordCount > 200 || attachmentsCount > 0);
    if (shouldSummarize) {
      job.startJob();
    }
  }, [hasSummary, wordCount, attachmentsCount, job]);

  return (
    <AgentJobModal
      isOpen={job.showModal}
      status={job.status}
      agentType="document-summarizer"
    />
  );
}
