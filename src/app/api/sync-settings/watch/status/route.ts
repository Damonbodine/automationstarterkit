import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getWatchStatus } from '@/lib/gmail/watch-manager';

/**
 * GET /api/sync-settings/watch/status
 * Get Gmail watch status for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getWatchStatus(session.user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('[Watch Status API] Error fetching status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch watch status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
