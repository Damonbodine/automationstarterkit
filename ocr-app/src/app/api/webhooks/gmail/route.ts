import { NextRequest, NextResponse } from 'next/server';
import { queueEmailSync } from '@/lib/queue/queues';
import { getSupabaseServerClient } from '@/lib/db/client';
import { verifyPubSubRequest } from '@/lib/google/pubsub-verify';

/**
 * Gmail Pub/Sub webhook handler
 * Receives notifications when new emails arrive
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Pub/Sub OIDC token (if enabled)
    const verified = await verifyPubSubRequest(request);
    if (!verified) {
      return NextResponse.json({ error: 'Unauthorized Pub/Sub message' }, { status: 401 });
    }

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

    // Update watch subscription's last_notification_at
    await supabase
      .from('gmail_watch_subscriptions')
      .update({ last_notification_at: new Date().toISOString() })
      .eq('user_id', userId);

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
