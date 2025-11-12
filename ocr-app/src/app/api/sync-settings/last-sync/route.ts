import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

/**
 * GET /api/sync-settings/last-sync
 * Check when the user was last synced
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get sync state
    const { data: syncState, error: syncError } = await supabase
      .from('email_sync_state')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (syncError && syncError.code !== 'PGRST116') {
      throw syncError;
    }

    // Get preferences
    const { data: prefs } = await supabase
      .from('user_sync_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    const now = new Date();
    const lastSyncAt = syncState?.last_sync_at ? new Date(syncState.last_sync_at) : null;
    const minutesSinceLastSync = lastSyncAt
      ? Math.floor((now.getTime() - lastSyncAt.getTime()) / (1000 * 60))
      : null;

    const pollingInterval = prefs?.polling_interval_minutes || 15;
    const isDueForSync = minutesSinceLastSync === null || minutesSinceLastSync >= pollingInterval;

    return NextResponse.json({
      user_id: session.user.id,
      email: session.user.email,
      last_sync_at: syncState?.last_sync_at || null,
      minutes_since_last_sync: minutesSinceLastSync,
      polling_interval_minutes: pollingInterval,
      is_due_for_sync: isDueForSync,
      auto_sync_enabled: prefs?.auto_sync_enabled || false,
      polling_enabled: prefs?.polling_enabled || false,
      sync_state: syncState || { status: 'never synced' },
    });
  } catch (error) {
    console.error('[Last Sync Check] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check last sync',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
