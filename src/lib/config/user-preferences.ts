import { getSupabaseServerClient } from '@/lib/db/client';

export interface ClientCustomConfig {
  timezone?: string;
  // Extend with other client-level settings as needed
}

export interface UserSyncPreferences {
  user_id: string;
  sync_strategy?: 'webhook' | 'polling' | 'hybrid';
  auto_sync_enabled?: boolean;
  polling_interval_minutes?: number;
  polling_enabled?: boolean;
  webhook_enabled?: boolean;
  custom_config?: ClientCustomConfig | null;
}

export async function getUserPreferences(userId: string): Promise<UserSyncPreferences | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_sync_preferences')
    .select('user_id, sync_strategy, auto_sync_enabled, polling_interval_minutes, polling_enabled, webhook_enabled, custom_config')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[preferences] Failed to load user_sync_preferences:', error);
    return null;
  }

  return (data as any) || null;
}

export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const prefs = await getUserPreferences(userId);
    const tz = prefs?.custom_config?.timezone || process.env.USER_DEFAULT_TZ || 'UTC';
    return tz;
  } catch {
    return process.env.USER_DEFAULT_TZ || 'UTC';
  }
}

