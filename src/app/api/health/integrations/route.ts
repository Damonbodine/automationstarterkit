import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/client';
import { getRedisClient } from '@/lib/queue/redis-client';

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const checks: Record<string, any> = {
    supabase: false,
    redis: false,
    google_creds: false,
    pubsub_audience: false,
  };

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.supabase = !error;
  } catch {
    checks.supabase = false;
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  checks.google_creds = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64)
  );

  checks.pubsub_audience = Boolean(process.env.PUBSUB_AUDIENCE);

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json({ ok, checks });
}

