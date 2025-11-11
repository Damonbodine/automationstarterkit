'use client';

import { Loader2, FileText, CheckCircle2, ListTodo, FileType } from 'lucide-react';
import type { AgentType, JobStatus } from '@/hooks/useAgentJob';

interface AgentJobModalProps {
  isOpen: boolean;
  status: JobStatus;
  agentType: AgentType;
}

const AGENT_INFO = {
  'document-summarizer': {
    icon: FileText,
    queuing: 'Queuing Summary...',
    processing: 'Generating AI Summary',
    completed: 'Summary Complete!',
    description: 'Claude is analyzing this email. This usually takes 10-30 seconds.',
  },
  'task-extractor': {
    icon: ListTodo,
    queuing: 'Queuing Task Extraction...',
    processing: 'Extracting Tasks',
    completed: 'Tasks Extracted!',
    description: 'Claude is identifying action items in this email.',
  },
  'sow-generator': {
    icon: FileType,
    queuing: 'Queuing SOW Generation...',
    processing: 'Generating Statement of Work',
    completed: 'SOW Generated!',
    description: 'Claude is creating a statement of work document.',
  },
};

export default function AgentJobModal({ isOpen, status, agentType }: AgentJobModalProps) {
  if (!isOpen) return null;

  const info = AGENT_INFO[agentType];
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'completed' ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {info.completed}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Refreshing page...
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Job Failed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please try again later
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-4">
                <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
                <Icon className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {status === 'queuing' ? info.queuing : info.processing}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {info.description}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
