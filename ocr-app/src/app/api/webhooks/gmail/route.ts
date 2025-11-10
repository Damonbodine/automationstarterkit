import { NextRequest, NextResponse } from 'next/server';
import { queueEmailSync } from '@/lib/queue/queues';
import { getSupabaseServerClient } from '@/lib/db/client';

/**
 * Gmail Pub/Sub webhook handler
 * Receives notifications when new emails arrive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Pub/Sub sends data as base64-encoded JSON in message.data
    if (!body.message?.data) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    const { emailAddress, historyId } = data;

    if (!emailAddress || !historyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find user by email
    const supabase = getSupabaseServerClient();
    const result = await supabase
      .from('users')
      .select('id')
      .eq('email', emailAddress)
      .maybeSingle();

    if (result.error || !result.data) {
      console.log(`User not found for email: ${emailAddress}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Queue incremental sync for this user
    const userId = (result.data as { id: string }).id;
    await queueEmailSync(userId, false);

    console.log(`Gmail webhook processed for user ${userId}, historyId: ${historyId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Verify Pub/Sub push endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', service: 'gmail-webhook' });
}
