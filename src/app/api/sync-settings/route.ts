import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

/**
 * GET /api/sync-settings
 * Get sync settings for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get sync preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_sync_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      throw prefsError;
    }

    // Get watch status
    const { data: watch } = await supabase
      .from('gmail_watch_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    return NextResponse.json({
      preferences: preferences || {
        sync_strategy: 'hybrid',
        auto_sync_enabled: false,
        polling_interval_minutes: 15,
        polling_enabled: true,
        webhook_enabled: false,
      },
      watch: watch ? {
        is_active: watch.is_active,
        expires_at: watch.watch_expires_at,
        last_error: watch.last_error,
      } : null,
    });
  } catch (error) {
    console.error('[Sync Settings API] Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sync-settings
 * Update sync settings for the authenticated user
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      auto_sync_enabled,
      sync_strategy,
      polling_interval_minutes,
      polling_enabled,
      webhook_enabled,
    } = body;

    // Validate inputs
    if (sync_strategy && !['webhook', 'polling', 'hybrid'].includes(sync_strategy)) {
      return NextResponse.json(
        { error: 'Invalid sync_strategy. Must be: webhook, polling, or hybrid' },
        { status: 400 }
      );
    }

    if (polling_interval_minutes !== undefined) {
      const interval = Number(polling_interval_minutes);
      if (isNaN(interval) || interval < 5 || interval > 1440) {
        return NextResponse.json(
          { error: 'polling_interval_minutes must be between 5 and 1440' },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseServerClient();

    // Build update object with only provided fields
    const updateData: any = {
      user_id: session.user.id,
    };

    if (auto_sync_enabled !== undefined) updateData.auto_sync_enabled = auto_sync_enabled;
    if (sync_strategy !== undefined) updateData.sync_strategy = sync_strategy;
    if (polling_interval_minutes !== undefined) updateData.polling_interval_minutes = polling_interval_minutes;
    if (polling_enabled !== undefined) updateData.polling_enabled = polling_enabled;
    if (webhook_enabled !== undefined) updateData.webhook_enabled = webhook_enabled;

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_sync_preferences')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // If enabling webhooks and no active watch exists, start one
    if (webhook_enabled === true || (sync_strategy && ['webhook', 'hybrid'].includes(sync_strategy))) {
      const { data: watch } = await supabase
        .from('gmail_watch_subscriptions')
        .select('is_active')
        .eq('user_id', session.user.id)
        .single();

      if (!watch || !watch.is_active) {
        // Queue watch setup asynchronously (don't block the response)
        import('@/lib/gmail/watch-manager').then(({ startGmailWatch }) => {
          startGmailWatch(session.user.id).catch(console.error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error('[Sync Settings API] Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    );
  }
}
