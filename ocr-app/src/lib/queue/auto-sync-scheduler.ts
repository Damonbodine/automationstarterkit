/**
 * Automatic Email Sync Scheduler
 *
 * Handles:
 * 1. Scheduled polling for users with polling enabled
 * 2. Gmail watch renewal for expiring subscriptions
 */

import { Queue } from 'bullmq';
import { getRedisClient } from './redis-client';
import { queueEmailSync } from './queues';
import { getSupabaseServerClient } from '@/lib/db/client';

// Scheduler queue for managing automatic sync jobs
const SCHEDULER_QUEUE_NAME = 'auto-sync-scheduler';

export interface AutoSyncSchedulerJob {
  type: 'check-polling' | 'renew-watches';
}

export const autoSyncSchedulerQueue = new Queue<AutoSyncSchedulerJob>(
  SCHEDULER_QUEUE_NAME,
  {
    connection: getRedisClient(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed scheduler jobs for 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
      },
    },
  }
);

/**
 * Initialize scheduled polling jobs
 * This should be called once at application startup
 */
export async function initializeAutoSyncScheduler() {
  console.log('[Auto-Sync Scheduler] Initializing automatic sync scheduler...');

  // Remove any existing repeatable jobs to avoid duplicates
  const repeatableJobs = await autoSyncSchedulerQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await autoSyncSchedulerQueue.removeRepeatableByKey(job.key);
  }

  // Schedule polling checker - runs every 5 minutes
  // This checks which users need to be synced based on their polling intervals
  await autoSyncSchedulerQueue.add(
    'check-polling',
    { type: 'check-polling' },
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
      jobId: 'check-polling-repeatable',
    }
  );

  // Schedule watch renewal checker - runs every hour
  // This checks for Gmail watches that are expiring soon and renews them
  await autoSyncSchedulerQueue.add(
    'renew-watches',
    { type: 'renew-watches' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
      jobId: 'renew-watches-repeatable',
    }
  );

  console.log('[Auto-Sync Scheduler] Scheduler initialized successfully');
  console.log('  - Polling checker: Every 5 minutes');
  console.log('  - Watch renewal: Every hour');
}

/**
 * Check which users need polling-based sync
 * This is called by the scheduler every 5 minutes
 */
export async function checkAndQueuePollingSyncs() {
  const supabase = getSupabaseServerClient();

  try {
    // Get all users with auto-sync and polling enabled
    const { data: preferences, error } = await supabase
      .from('user_sync_preferences')
      .select('user_id, polling_interval_minutes, sync_strategy')
      .eq('auto_sync_enabled', true)
      .eq('polling_enabled', true)
      .in('sync_strategy', ['polling', 'hybrid']);

    if (error) {
      console.error('[Auto-Sync] Error fetching sync preferences:', error);
      return;
    }

    if (!preferences || preferences.length === 0) {
      console.log('[Auto-Sync] No users with polling enabled');
      return;
    }

    console.log(`[Auto-Sync] Checking ${preferences.length} users for polling sync...`);

    // For each user, check if they're due for a sync
    for (const pref of preferences) {
      const { user_id, polling_interval_minutes } = pref;
      const intervalMinutes = polling_interval_minutes || 15; // Default to 15 minutes

      // Get the last sync time for this user
      const { data: syncState } = await supabase
        .from('email_sync_state')
        .select('last_sync_at')
        .eq('user_id', user_id)
        .single();

      const lastSyncAt = syncState?.last_sync_at
        ? new Date(syncState.last_sync_at)
        : new Date(0); // If never synced, treat as epoch

      const now = new Date();
      const minutesSinceLastSync = (now.getTime() - lastSyncAt.getTime()) / (1000 * 60);

      // Queue a sync if the interval has elapsed
      if (minutesSinceLastSync >= intervalMinutes) {
        console.log(`[Auto-Sync] Queueing sync for user ${user_id} (${Math.round(minutesSinceLastSync)} minutes since last sync)`);

        await queueEmailSync(user_id, false); // Incremental sync
      }
    }
  } catch (error) {
    console.error('[Auto-Sync] Error in checkAndQueuePollingSyncs:', error);
    throw error;
  }
}

/**
 * Check for Gmail watches that need renewal
 * Gmail watches expire after 7 days max, so we renew them when they're within 24 hours of expiring
 */
export async function checkAndRenewWatches() {
  const supabase = getSupabaseServerClient();

  try {
    // Get all active watches that expire within the next 24 hours
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() + 24);

    const { data: watches, error } = await supabase
      .from('gmail_watch_subscriptions')
      .select('*')
      .eq('is_active', true)
      .lt('watch_expires_at', expirationThreshold.toISOString());

    if (error) {
      console.error('[Watch Renewal] Error fetching watches:', error);
      return;
    }

    if (!watches || watches.length === 0) {
      console.log('[Watch Renewal] No watches need renewal');
      return;
    }

    console.log(`[Watch Renewal] Found ${watches.length} watches to renew`);

    // Import the watch renewal function dynamically to avoid circular dependencies
    const { renewGmailWatch } = await import('@/lib/gmail/watch-manager');

    // Renew each watch
    for (const watch of watches) {
      try {
        console.log(`[Watch Renewal] Renewing watch for user ${watch.user_id}`);
        await renewGmailWatch(watch.user_id);
      } catch (error) {
        console.error(`[Watch Renewal] Failed to renew watch for user ${watch.user_id}:`, error);

        // Update the watch with error details
        await supabase
          .from('gmail_watch_subscriptions')
          .update({
            last_error: error instanceof Error ? error.message : 'Unknown error',
            renewal_attempt_count: (watch.renewal_attempt_count || 0) + 1,
          })
          .eq('id', watch.id);
      }
    }
  } catch (error) {
    console.error('[Watch Renewal] Error in checkAndRenewWatches:', error);
    throw error;
  }
}

/**
 * Manually trigger a polling check (useful for testing)
 */
export async function triggerPollingCheck() {
  return await autoSyncSchedulerQueue.add(
    'check-polling',
    { type: 'check-polling' },
    {
      jobId: `manual-polling-check-${Date.now()}`,
    }
  );
}

/**
 * Manually trigger a watch renewal check (useful for testing)
 */
export async function triggerWatchRenewal() {
  return await autoSyncSchedulerQueue.add(
    'renew-watches',
    { type: 'renew-watches' },
    {
      jobId: `manual-watch-renewal-${Date.now()}`,
    }
  );
}

/**
 * Get scheduler statistics
 */
export async function getSchedulerStats() {
  const [waiting, active, completed, failed, repeatableJobs] = await Promise.all([
    autoSyncSchedulerQueue.getWaitingCount(),
    autoSyncSchedulerQueue.getActiveCount(),
    autoSyncSchedulerQueue.getCompletedCount(),
    autoSyncSchedulerQueue.getFailedCount(),
    autoSyncSchedulerQueue.getRepeatableJobs(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    repeatableJobs: repeatableJobs.map((job) => ({
      key: job.key,
      name: job.name,
      pattern: job.pattern,
      next: job.next,
    })),
  };
}
