import { Worker, Job } from 'bullmq';
import { getRedisClient } from './redis-client';
import {
  QUEUE_NAMES,
  EmailSyncJob,
  EmailClassificationJob,
  AIAgentJob,
} from './queues';
import { queueDeadLetter, QUEUE_NAMES as NAMES, deadLetterQueue, DeadLetterJob } from './queues';
import { syncEmails } from '@/lib/email/email-sync';
import { classifyEmail } from '@/lib/ai/classifier';
import { extractTasks } from '@/lib/ai/agents/task-extractor';
import { summarizeDocument } from '@/lib/ai/agents/document-summarizer';
import { generateSOW } from '@/lib/ai/agents/sow-generator';
import {
  AutoSyncSchedulerJob,
  checkAndQueuePollingSyncs,
  checkAndRenewWatches,
} from './auto-sync-scheduler';
import { orchestrationHooks } from '@/lib/orchestration/hooks';
import { documentOcrQueue, DocumentOCRJob, queueAIAgent } from './queues';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';
import { ocrPdfFromGCS } from '@/lib/ocr/pdf-ocr';
import { getSupabaseServerClient } from '@/lib/db/client';

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

      // Fire orchestration hook post-classification
      await orchestrationHooks.onEmailClassified({ userId, emailId, classification });

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
      let result: any = null;
      switch (type) {
        case 'sow-generator':
          result = await generateSOW({ emailId, userId, metadata });
          break;
        case 'task-extractor':
          result = await extractTasks(emailId);
          break;
        case 'document-summarizer':
          result = await summarizeDocument(emailId);
          break;
      }

      return { success: true, type, result };
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
 * Dead Letter Worker
 * Consumes failed jobs for inspection/alerting (no retries)
 */
export const deadLetterWorker = new Worker<DeadLetterJob>(
  NAMES.DEAD_LETTER,
  async (job: Job<DeadLetterJob>) => {
    const { originalQueue, jobName, attemptsMade, failedReason } = job.data;
    console.error(
      `Dead-lettered job from ${originalQueue} (${jobName}), attempts: ${attemptsMade}, reason: ${failedReason}`
    );
    return { acknowledged: true };
  },
  {
    connection: getRedisClient(),
    concurrency: 1,
  }
);

/**
 * Document OCR Worker (PDFs)
 */
export const documentOcrWorker = new Worker<DocumentOCRJob>(
  QUEUE_NAMES.DOCUMENT_OCR,
  async (job: Job<DocumentOCRJob>) => {
    const { documentId, userId, gcsUrl, mimeType } = job.data;
    if (mimeType !== 'application/pdf') {
      return { skipped: true };
    }

    const vision = new ImageAnnotatorClient();
    const storage = new Storage();
    const bucket = process.env.GCS_BUCKET_NAME;
    if (!bucket) throw new Error('GCS_BUCKET_NAME not set');

    const text = await ocrPdfFromGCS(vision, storage, bucket, gcsUrl);

    const supabase = getSupabaseServerClient();
    await supabase
      .from('documents')
      .update({ ocr_text: text, ocr_completed_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('user_id', userId);

    // Re-summarize the parent email if available
    const { data: docRow } = await supabase
      .from('documents')
      .select('email_id')
      .eq('id', documentId)
      .single();
    const emailId = docRow?.email_id as string | undefined;
    if (emailId) {
      await queueAIAgent('document-summarizer', emailId, userId);
    }

    return { success: true, length: text.length };
  },
  {
    connection: getRedisClient(),
    concurrency: 2,
  }
);

/**
 * Auto-Sync Scheduler Worker
 * Processes scheduled polling checks and watch renewals
 */
export const autoSyncSchedulerWorker = new Worker<AutoSyncSchedulerJob>(
  'auto-sync-scheduler',
  async (job: Job<AutoSyncSchedulerJob>) => {
    const { type } = job.data;

    console.log(`[Auto-Sync Scheduler] Processing ${type} job`);

    try {
      switch (type) {
        case 'check-polling':
          await checkAndQueuePollingSyncs();
          return { success: true, type: 'check-polling' };

        case 'renew-watches':
          await checkAndRenewWatches();
          return { success: true, type: 'renew-watches' };

        default:
          throw new Error(`Unknown scheduler job type: ${type}`);
      }
    } catch (error) {
      console.error(`[Auto-Sync Scheduler] Job ${type} failed:`, error);
      throw error;
    }
  },
  {
    connection: getRedisClient(),
    concurrency: 1, // Process scheduler jobs one at a time
  }
);

/**
 * Register error handlers for all workers
 */
[emailSyncWorker, emailClassificationWorker, aiAgentsWorker, deadLetterWorker, autoSyncSchedulerWorker, documentOcrWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);

    // If no job or no attempts info, skip DLQ processing
    if (!job) return;

    const attempts = job.opts.attempts ?? 1;
    const attemptsMade = job.attemptsMade ?? 0;

    // Push to dead-letter queue only after exhausting retries
    if (attemptsMade >= attempts) {
      const originalQueue = (job.queueName as keyof typeof NAMES) || 'UNKNOWN';
      queueDeadLetter({
        originalQueue,
        jobName: job.name,
        data: job.data as Record<string, any>,
        attemptsMade,
        failedReason: err?.message,
        stacktrace: job.stacktrace,
      }).catch((e) => {
        console.error('Failed to enqueue dead-letter job:', e);
      });
    }
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
    deadLetterWorker.close(),
    autoSyncSchedulerWorker.close(),
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
