import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import type { Database } from '@/types/database';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { emailId } = await ctx.params;
    const supabase = getSupabaseServerClient();

    // Ensure email belongs to user
    const { data: email } = await supabase
      .from('email_messages')
      .select('id')
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

    const { data: cls } = await supabase
      .from('email_classifications')
      .select('*')
      .eq('email_id', emailId)
      .maybeSingle();

    return NextResponse.json({ classification: cls || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { emailId } = await ctx.params;
    const body = await req.json();

    const supabase = getSupabaseServerClient();

    // Ensure email belongs to user
    const { data: email } = await supabase
      .from('email_messages')
      .select('id')
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

    // Update classification with user feedback/corrections
    const update: Partial<Database['public']['Tables']['email_classifications']['Update']> = {
      category: body.category,
      priority: body.priority,
      sentiment: body.sentiment,
      tags: body.tags,
      assigned_agents: body.assigned_agents,
      user_feedback: body.user_feedback,
      confidence_score: body.confidence_score ?? 1.0,
      classified_at: new Date().toISOString(),
      email_id: emailId,
    };

    // @ts-ignore - Supabase type inference issue
    await supabase.from('email_classifications').upsert(update);

    // Log feedback
    // @ts-ignore - Supabase type inference issue
    await supabase.from('agent_logs').insert({
      user_id: session.user.id,
      email_id: emailId,
      agent_type: 'classifier',
      action: 'user_feedback',
      input_data: body,
      output_data: update,
      success: true,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

