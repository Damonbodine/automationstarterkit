import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { queueEmailSync } from '@/lib/queue/queues';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Support JSON, form posts, or empty body
    let fullSync = false;
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        const body = await request.json();
        fullSync = body?.fullSync === true || body?.fullSync === 'true';
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        const val = form.get('fullSync');
        fullSync = val === 'true' || val === '1';
      } else {
        // No body provided (e.g., simple <form method="POST">) -> default to partial sync
        fullSync = false;
      }
    } catch {
      // Ignore parsing errors and fall back to default
      fullSync = false;
    }

    // Queue email sync job
    const job = await queueEmailSync(session.user.id, fullSync);

    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      const url = new URL('/dashboard?sync=queued', request.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Email sync ${fullSync ? '(full)' : ''} queued`,
    });
  } catch (error) {
    console.error('Email sync API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to queue email sync',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getSupabaseServerClient } = await import('@/lib/db/client');
    const supabase = getSupabaseServerClient();

    const { data: syncState } = await supabase
      .from('email_sync_state')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    return NextResponse.json({ syncState });
  } catch (error) {
    console.error('Get sync state error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync state' },
      { status: 500 }
    );
  }
}
