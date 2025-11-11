"use client";

import { Button } from '@/components/ui/Button';
import { FileText, ListTodo, FileType } from 'lucide-react';
import * as React from 'react';
import { useAgentJob, type AgentType } from '@/hooks/useAgentJob';
import AgentJobModal from './AgentJobModal';

export default function RunAgentActions({ emailId }: { emailId: string }) {
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({
    'task-extractor': true,
    'document-summarizer': true,
    'sow-generator': true,
  });

  const [activeAgent, setActiveAgent] = React.useState<AgentType | null>(null);

  const summarizerJob = useAgentJob(emailId, 'document-summarizer');
  const taskExtractorJob = useAgentJob(emailId, 'task-extractor');
  const sowGeneratorJob = useAgentJob(emailId, 'sow-generator');

  React.useEffect(() => {
    const get = (k: string) => {
      const raw = localStorage.getItem(`agent:${k}:enabled`);
      return raw === null ? true : raw === 'true';
    };
    setEnabled({
      'task-extractor': get('task-extractor'),
      'document-summarizer': get('document-summarizer'),
      'sow-generator': get('sow-generator'),
    });
  }, []);

  const run = (type: AgentType) => {
    setActiveAgent(type);
    if (type === 'document-summarizer') {
      summarizerJob.startJob();
    } else if (type === 'task-extractor') {
      taskExtractorJob.startJob();
    } else if (type === 'sow-generator') {
      sowGeneratorJob.startJob();
    }
  };

  const getJobForAgent = () => {
    if (activeAgent === 'document-summarizer') return summarizerJob;
    if (activeAgent === 'task-extractor') return taskExtractorJob;
    if (activeAgent === 'sow-generator') return sowGeneratorJob;
    return summarizerJob;
  };

  const currentJob = getJobForAgent();

  return (
    <>
      {activeAgent && (
        <AgentJobModal
          isOpen={currentJob.showModal}
          status={currentJob.status}
          agentType={activeAgent}
        />
      )}

      <div className="space-y-2">
        {enabled['document-summarizer'] && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => run('document-summarizer')}
            disabled={currentJob.isRunning}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Summary
          </Button>
        )}
        {enabled['task-extractor'] && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => run('task-extractor')}
            disabled={currentJob.isRunning}
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Extract Tasks
          </Button>
        )}
        {enabled['sow-generator'] && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => run('sow-generator')}
            disabled={currentJob.isRunning}
          >
            <FileType className="h-4 w-4 mr-2" />
            Generate SOW
          </Button>
        )}
      </div>
    </>
  );
}
