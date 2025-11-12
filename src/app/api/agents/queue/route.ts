import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { queueAIAgent } from '@/lib/queue/queues';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const emailId = String(body.emailId || '');
    const type = body.type as 'sow-generator' | 'task-extractor' | 'document-summarizer';

    if (!emailId || !type) {
      return NextResponse.json({ error: 'Missing emailId or type' }, { status: 400 });
    }

    const job = await queueAIAgent(type, emailId, session.user.id, body.metadata || {});
    return NextResponse.json({ success: true, jobId: job.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to enqueue agent' }, { status: 500 });
  }
}

