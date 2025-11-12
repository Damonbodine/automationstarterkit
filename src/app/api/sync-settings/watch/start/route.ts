import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { startGmailWatch } from '@/lib/gmail/watch-manager';

/**
 * POST /api/sync-settings/watch/start
 * Start Gmail push notification watch for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await startGmailWatch(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Gmail watch started successfully',
    });
  } catch (error) {
    console.error('[Watch Start API] Error starting watch:', error);
    return NextResponse.json(
      {
        error: 'Failed to start Gmail watch',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
