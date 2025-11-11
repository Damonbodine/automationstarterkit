import { NextResponse } from 'next/server';
import { getQueueStats, QUEUE_NAMES } from '@/lib/queue/queues';

export async function GET() {
  try {
    const [emailSync, emailClassification, aiAgents, deadLetter] = await Promise.all([
      getQueueStats(QUEUE_NAMES.EMAIL_SYNC),
      getQueueStats(QUEUE_NAMES.EMAIL_CLASSIFICATION),
      getQueueStats(QUEUE_NAMES.AI_AGENTS),
      getQueueStats(QUEUE_NAMES.DEAD_LETTER),
    ]);

    return NextResponse.json({
      emailSync,
      emailClassification,
      aiAgents,
      deadLetter,
    });
  } catch (err) {
    console.error('Queue stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
  }
}

