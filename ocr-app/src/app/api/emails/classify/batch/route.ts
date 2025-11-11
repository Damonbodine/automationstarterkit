import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import { queueEmailClassification } from '@/lib/queue/queues';
import { classifyEmail } from '@/lib/ai/classifier';

type Body = {
  emailIds?: string[];
  limit?: number; // fallback: classify last N unclassified emails
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const supabase = getSupabaseServerClient();

    let emailIds: string[] = body.emailIds || [];

    if (emailIds.length === 0) {
      // Select last N emails without a classification
      const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);

      // Get recent email ids for user
      const { data: emails } = await supabase
        .from('email_messages')
        .select('id')
        .eq('user_id', session.user.id)
        .order('received_at', { ascending: false })
        .limit(limit);

      const ids = (emails || []).map((e: any) => e.id);

      if (ids.length) {
        // Remove already classified
        const { data: already } = await supabase
          .from('email_classifications')
          .select('email_id')
          .in('email_id', ids);

        const alreadySet = new Set((already || []).map((r: any) => r.email_id));
        emailIds = ids.filter((id: string) => !alreadySet.has(id));
      }
    }

    if (emailIds.length === 0) {
      return NextResponse.json({ queued: 0, mode: 'noop' });
    }

    const useQueue = !!process.env.REDIS_URL;
    let queued = 0;
    let processed = 0;

    if (useQueue) {
      await Promise.all(
        emailIds.map(async (id) => {
          await queueEmailClassification(id, session.user.id);
          queued += 1;
        })
      );
    } else {
      // No Redis configured; run inline for dev
      await Promise.all(
        emailIds.map(async (id) => {
          await classifyEmail(id);
          processed += 1;
        })
      );
    }

    return NextResponse.json({
      success: true,
      total: emailIds.length,
      queued,
      processed,
      mode: useQueue ? 'queue' : 'inline',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

