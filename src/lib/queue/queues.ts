import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from './redis-client';

// Queue names
export const QUEUE_NAMES = {
  EMAIL_SYNC: 'email-sync',
  EMAIL_CLASSIFICATION: 'email-classification',
  AI_AGENTS: 'ai-agents',
  DOCUMENT_OCR: 'document-ocr',
  DEAD_LETTER: 'dead-letter',
} as const;

// Job types
export interface EmailSyncJob {
  userId: string;
  fullSync?: boolean;
}

export interface EmailClassificationJob {
  emailId: string;
  userId: string;
}

export interface AIAgentJob {
  type: 'sow-generator' | 'task-extractor' | 'document-summarizer';
  emailId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface DocumentOCRJob {
  documentId: string;
  userId: string;
  gcsUrl: string;
  mimeType: string;
}

export interface DeadLetterJob {
  originalQueue: keyof typeof QUEUE_NAMES;
  jobName: string;
  data: Record<string, any>;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
}

// Queue configurations
const queueConfig = {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Email Sync Queue
export const emailSyncQueue = new Queue<EmailSyncJob>(
  QUEUE_NAMES.EMAIL_SYNC,
  queueConfig
);

// Email Classification Queue
export const emailClassificationQueue = new Queue<EmailClassificationJob>(
  QUEUE_NAMES.EMAIL_CLASSIFICATION,
  queueConfig
);

// AI Agents Queue
export const aiAgentsQueue = new Queue<AIAgentJob>(
  QUEUE_NAMES.AI_AGENTS,
  queueConfig
);

// Document OCR Queue
export const documentOcrQueue = new Queue<DocumentOCRJob>(
  QUEUE_NAMES.DOCUMENT_OCR,
  queueConfig
);

// Dead Letter Queue
export const deadLetterQueue = new Queue<DeadLetterJob>(
  QUEUE_NAMES.DEAD_LETTER,
  queueConfig
);

/**
 * Add email sync job to queue
 */
export async function queueEmailSync(userId: string, fullSync = false) {
  return await emailSyncQueue.add(
    'sync-emails',
    { userId, fullSync },
    {
      priority: fullSync ? 1 : 2,
      jobId: `email-sync-${userId}-${Date.now()}`,
    }
  );
}

/**
 * Add email classification job to queue
 */
export async function queueEmailClassification(emailId: string, userId: string) {
  return await emailClassificationQueue.add(
    'classify-email',
    { emailId, userId },
    {
      priority: 1,
      jobId: `classify-${emailId}`,
      // Deduplicate - don't classify same email twice
      removeOnComplete: true,
    }
  );
}

/**
 * Add AI agent job to queue
 */
export async function queueAIAgent(
  type: AIAgentJob['type'],
  emailId: string,
  userId: string,
  metadata?: Record<string, any>
) {
  return await aiAgentsQueue.add(
    type,
    { type, emailId, userId, metadata },
    {
      priority: type === 'sow-generator' ? 1 : 2,
      jobId: `${type}-${emailId}`,
    }
  );
}

/** Queue a document OCR job */
export async function queueDocumentOCR(job: DocumentOCRJob) {
  return await documentOcrQueue.add(
    'document-ocr',
    job,
    {
      jobId: `doc-ocr-${job.documentId}`,
      priority: 1,
      removeOnComplete: true,
    }
  );
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string) {
  let queue: Queue;

  switch (queueName) {
    case QUEUE_NAMES.EMAIL_SYNC:
      queue = emailSyncQueue;
      break;
    case QUEUE_NAMES.EMAIL_CLASSIFICATION:
      queue = emailClassificationQueue;
      break;
    case QUEUE_NAMES.AI_AGENTS:
      queue = aiAgentsQueue;
      break;
    case QUEUE_NAMES.DEAD_LETTER:
      queue = deadLetterQueue;
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Add a job to the dead-letter queue after exhausting retries
 */
export async function queueDeadLetter(payload: DeadLetterJob) {
  return await deadLetterQueue.add('dead-letter', payload, {
    removeOnComplete: false,
    removeOnFail: false,
  });
}
