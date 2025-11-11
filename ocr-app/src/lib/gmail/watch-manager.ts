/**
 * Gmail Watch Manager
 *
 * Manages Gmail push notification watches for automatic email syncing.
 * Gmail watches expire after 7 days max and need to be renewed.
 */

import { GmailClient } from './gmail-client';
import { getSupabaseServerClient } from '@/lib/db/client';

const PUBSUB_TOPIC = process.env.PUBSUB_TOPIC || 'gmail-notifications';

/**
 * Start watching Gmail for a user
 * Creates a Gmail watch subscription and saves it to the database
 */
export async function startGmailWatch(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  try {
    console.log(`[Watch Manager] Starting Gmail watch for user ${userId}`);

    // Get user's tokens from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.google_access_token || !user.google_refresh_token) {
      throw new Error(`User ${userId} does not have Google OAuth tokens`);
    }

    // Create Gmail client
    const gmailClient = new GmailClient(
      user.google_access_token,
      user.google_refresh_token
    );

    // Start watching
    const watchResponse = await gmailClient.watch(PUBSUB_TOPIC);

    // Calculate expiration (Gmail provides expiration in milliseconds)
    const expiresAt = new Date(Number(watchResponse.expiration));

    console.log(`[Watch Manager] Watch started successfully. Expires at: ${expiresAt.toISOString()}`);

    // Check if user already has an active watch
    const { data: existingWatch } = await supabase
      .from('gmail_watch_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingWatch) {
      // Update existing watch
      const { error: updateError } = await supabase
        .from('gmail_watch_subscriptions')
        .update({
          watch_started_at: new Date().toISOString(),
          watch_expires_at: expiresAt.toISOString(),
          pubsub_topic: PUBSUB_TOPIC,
          is_active: true,
          last_renewed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', existingWatch.id);

      if (updateError) {
        throw new Error(`Failed to update watch record: ${updateError.message}`);
      }
    } else {
      // Create new watch record
      const { error: insertError } = await supabase
        .from('gmail_watch_subscriptions')
        .insert({
          user_id: userId,
          watch_started_at: new Date().toISOString(),
          watch_expires_at: expiresAt.toISOString(),
          pubsub_topic: PUBSUB_TOPIC,
          is_active: true,
        });

      if (insertError) {
        throw new Error(`Failed to create watch record: ${insertError.message}`);
      }
    }

    // Enable webhooks in user sync preferences
    const { error: prefsError } = await supabase
      .from('user_sync_preferences')
      .update({ webhook_enabled: true })
      .eq('user_id', userId);

    if (prefsError) {
      console.warn(`[Watch Manager] Failed to update sync preferences: ${prefsError.message}`);
    }

    console.log(`[Watch Manager] Watch setup complete for user ${userId}`);
  } catch (error) {
    console.error(`[Watch Manager] Failed to start watch for user ${userId}:`, error);

    // Record the error in the database
    await supabase
      .from('gmail_watch_subscriptions')
      .upsert({
        user_id: userId,
        pubsub_topic: PUBSUB_TOPIC,
        is_active: false,
        last_error: error instanceof Error ? error.message : 'Unknown error',
        watch_started_at: new Date().toISOString(),
        watch_expires_at: new Date().toISOString(), // Set to now to indicate expired
      }, {
        onConflict: 'user_id',
      });

    throw error;
  }
}

/**
 * Stop watching Gmail for a user
 */
export async function stopGmailWatch(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  try {
    console.log(`[Watch Manager] Stopping Gmail watch for user ${userId}`);

    // Get user's tokens from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.google_access_token || !user.google_refresh_token) {
      throw new Error(`User ${userId} does not have Google OAuth tokens`);
    }

    // Create Gmail client
    const gmailClient = new GmailClient(
      user.google_access_token,
      user.google_refresh_token
    );

    // Stop watching
    await gmailClient.stopWatch();

    // Update database
    const { error: updateError } = await supabase
      .from('gmail_watch_subscriptions')
      .update({
        is_active: false,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.warn(`[Watch Manager] Failed to update watch record: ${updateError.message}`);
    }

    // Disable webhooks in user sync preferences
    const { error: prefsError } = await supabase
      .from('user_sync_preferences')
      .update({ webhook_enabled: false })
      .eq('user_id', userId);

    if (prefsError) {
      console.warn(`[Watch Manager] Failed to update sync preferences: ${prefsError.message}`);
    }

    console.log(`[Watch Manager] Watch stopped for user ${userId}`);
  } catch (error) {
    console.error(`[Watch Manager] Failed to stop watch for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Renew a Gmail watch that's about to expire
 */
export async function renewGmailWatch(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  let watch: any = null;

  try {
    console.log(`[Watch Manager] Renewing Gmail watch for user ${userId}`);

    // Get current watch info
    const { data: watchData, error: watchError } = await supabase
      .from('gmail_watch_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (watchError || !watchData) {
      throw new Error(`No watch found for user ${userId}`);
    }

    watch = watchData;

    // Stop the old watch first (if it's still active)
    try {
      await stopGmailWatch(userId);
    } catch (error) {
      console.warn(`[Watch Manager] Failed to stop old watch (may already be expired):`, error);
    }

    // Start a new watch
    await startGmailWatch(userId);

    console.log(`[Watch Manager] Watch renewed successfully for user ${userId}`);
  } catch (error) {
    console.error(`[Watch Manager] Failed to renew watch for user ${userId}:`, error);

    // Update the watch record with error
    await supabase
      .from('gmail_watch_subscriptions')
      .update({
        last_error: error instanceof Error ? error.message : 'Unknown error',
        renewal_attempt_count: watch?.renewal_attempt_count ? watch.renewal_attempt_count + 1 : 1,
      })
      .eq('user_id', userId);

    throw error;
  }
}

/**
 * Get watch status for a user
 */
export async function getWatchStatus(userId: string) {
  const supabase = getSupabaseServerClient();

  const { data: watch, error } = await supabase
    .from('gmail_watch_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }

  if (!watch) {
    return {
      enabled: false,
      exists: false,
    };
  }

  const now = new Date();
  const expiresAt = new Date(watch.watch_expires_at);
  const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return {
    enabled: watch.is_active,
    exists: true,
    expiresAt: watch.watch_expires_at,
    hoursUntilExpiration: Math.round(hoursUntilExpiration * 10) / 10, // Round to 1 decimal
    needsRenewal: hoursUntilExpiration < 24,
    lastError: watch.last_error,
    renewalAttempts: watch.renewal_attempt_count,
  };
}

/**
 * Enable automatic syncing for a user with specified strategy
 */
export async function enableAutoSync(
  userId: string,
  strategy: 'webhook' | 'polling' | 'hybrid' = 'hybrid'
): Promise<void> {
  const supabase = getSupabaseServerClient();

  // Update sync preferences
  const { error } = await supabase
    .from('user_sync_preferences')
    .upsert({
      user_id: userId,
      auto_sync_enabled: true,
      sync_strategy: strategy,
      polling_enabled: strategy === 'polling' || strategy === 'hybrid',
      webhook_enabled: strategy === 'webhook' || strategy === 'hybrid',
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    throw new Error(`Failed to enable auto-sync: ${error.message}`);
  }

  // If webhook or hybrid, start the watch
  if (strategy === 'webhook' || strategy === 'hybrid') {
    try {
      await startGmailWatch(userId);
    } catch (error) {
      console.error(`[Watch Manager] Failed to start watch when enabling auto-sync:`, error);
      // Don't throw - polling can still work
    }
  }

  console.log(`[Watch Manager] Auto-sync enabled for user ${userId} with strategy: ${strategy}`);
}

/**
 * Disable automatic syncing for a user
 */
export async function disableAutoSync(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  // Update sync preferences
  const { error } = await supabase
    .from('user_sync_preferences')
    .update({
      auto_sync_enabled: false,
      polling_enabled: false,
      webhook_enabled: false,
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to disable auto-sync: ${error.message}`);
  }

  // Stop the watch if it exists
  try {
    await stopGmailWatch(userId);
  } catch (error) {
    console.warn(`[Watch Manager] Failed to stop watch when disabling auto-sync:`, error);
    // Don't throw - we still want to disable auto-sync
  }

  console.log(`[Watch Manager] Auto-sync disabled for user ${userId}`);
}
