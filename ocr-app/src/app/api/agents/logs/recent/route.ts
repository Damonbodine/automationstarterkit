import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return NextResponse.json({ logs: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch logs' }, { status: 500 });
  }
}

