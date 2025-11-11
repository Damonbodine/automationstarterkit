import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, description } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description: description || null, user_id: session.user.id })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, project: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create project' }, { status: 500 });
  }
}

