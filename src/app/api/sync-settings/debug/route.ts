import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

/**
 * GET /api/sync-settings/debug
 * Debug endpoint to check sync settings configuration
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get all sync preferences
    const { data: allPrefs, error: allPrefsError } = await supabase
      .from('user_sync_preferences')
      .select('*');

    if (allPrefsError) {
      return NextResponse.json({
        error: 'Failed to query user_sync_preferences',
        details: allPrefsError.message,
        hint: 'Migration 007 may not have been run yet',
      }, { status: 500 });
    }

    // Get current user's preferences
    const { data: userPrefs, error: userPrefsError } = await supabase
      .from('user_sync_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    // Get watch subscriptions
    const { data: watches, error: watchesError } = await supabase
      .from('gmail_watch_subscriptions')
      .select('*');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');

    return NextResponse.json({
      migration_status: 'tables exist',
      total_users: users?.length || 0,
      total_preferences: allPrefs?.length || 0,
      total_watches: watches?.length || 0,
      users_with_auto_sync_enabled: allPrefs?.filter(p => p.auto_sync_enabled).length || 0,
      current_user: {
        id: session.user.id,
        email: session.user.email,
        has_preferences: !!userPrefs,
        preferences: userPrefs || null,
      },
      all_users: users?.map(u => {
        const pref = allPrefs?.find(p => p.user_id === u.id);
        const watch = watches?.find(w => w.user_id === u.id);
        return {
          email: u.email,
          auto_sync_enabled: pref?.auto_sync_enabled || false,
          sync_strategy: pref?.sync_strategy || 'none',
          polling_interval: pref?.polling_interval_minutes || 0,
          has_watch: !!watch,
          watch_active: watch?.is_active || false,
        };
      }),
    });
  } catch (error) {
    console.error('[Sync Settings Debug] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch debug info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
