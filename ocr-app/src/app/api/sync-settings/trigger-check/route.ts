import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { triggerPollingCheck } from '@/lib/queue/auto-sync-scheduler';

/**
 * POST /api/sync-settings/trigger-check
 * Manually trigger a polling check (for testing)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Trigger Check] Manual polling check requested');
    const job = await triggerPollingCheck();

    return NextResponse.json({
      success: true,
      message: 'Polling check queued',
      jobId: job.id,
      hint: 'Check your server logs for sync activity',
    });
  } catch (error) {
    console.error('[Trigger Check] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger polling check',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
