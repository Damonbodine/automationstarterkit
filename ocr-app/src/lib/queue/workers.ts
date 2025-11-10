import { Worker, Job } from 'bullmq';
import { getRedisClient } from './redis-client';
import {
  QUEUE_NAMES,
  EmailSyncJob,
  EmailClassificationJob,
  AIAgentJob,
} from './queues';
import { syncEmails } from '@/lib/email/email-sync';
import { classifyEmail } from '@/lib/ai/classifier';

/**
 * Email Sync Worker
 * Processes email synchronization jobs
 */
export const emailSyncWorker = new Worker<EmailSyncJob>(
  QUEUE_NAMES.EMAIL_SYNC,
  async (job: Job<EmailSyncJob>) => {
    const { userId, fullSync } = job.data;

    console.log(`Processing email sync for user ${userId}, fullSync: ${fullSync}`);

    try {
      const result = await syncEmails(userId, fullSync);

      console.log(
        `Email sync completed for user ${userId}: ${result.synced} synced, ${result.errors} errors`
      );

      return result;
    } catch (error) {
      console.error(`Email sync failed for user ${userId}:`, error);
      throw error;
    }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

/**
 * Email Classification Worker
 * Processes email classification jobs
 */
export const emailClassificationWorker = new Worker<EmailClassificationJob>(
  QUEUE_NAMES.EMAIL_CLASSIFICATION,
  async (job: Job<EmailClassificationJob>) => {
    const { emailId, userId } = job.data;

    console.log(`Classifying email ${emailId} for user ${userId}`);

    try {
      const classification = await classifyEmail(emailId);

      console.log(
        `Email ${emailId} classified as ${classification.category} (confidence: ${classification.confidence_score})`
      );

      return classification;
    } catch (error) {
      console.error(`Classification failed for email ${emailId}:`, error);
      throw error;
    }
  },
  {
    connection: getRedisClient(),
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 1000,
    },
  }
);

/**
 * AI Agents Worker
 * Processes AI agent jobs (SOW generator, task extractor, etc.)
 */
export const aiAgentsWorker = new Worker<AIAgentJob>(
  QUEUE_NAMES.AI_AGENTS,
  async (job: Job<AIAgentJob>) => {
    const { type, emailId, userId, metadata } = job.data;

    console.log(`Processing ${type} for email ${emailId}, user ${userId}`);

    try {
      // TODO: Implement agent logic
      switch (type) {
        case 'sow-generator':
          // Generate SOW document
          console.log('SOW generator not yet implemented');
          break;
        case 'task-extractor':
          // Extract tasks from email
          console.log('Task extractor not yet implemented');
          break;
        case 'document-summarizer':
          // Summarize document
          console.log('Document summarizer not yet implemented');
          break;
      }

      return { success: true, type };
    } catch (error) {
      console.error(`AI agent ${type} failed for email ${emailId}:`, error);
      throw error;
    }
  },
  {
    connection: getRedisClient(),
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000,
    },
  }
);

/**
 * Register error handlers for all workers
 */
[emailSyncWorker, emailClassificationWorker, aiAgentsWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });
});

/**
 * Graceful shutdown for all workers
 */
export async function closeWorkers(): Promise<void> {
  console.log('Closing workers...');

  await Promise.all([
    emailSyncWorker.close(),
    emailClassificationWorker.close(),
    aiAgentsWorker.close(),
  ]);

  console.log('All workers closed');
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closeWorkers();
  process.exit(0);
});
