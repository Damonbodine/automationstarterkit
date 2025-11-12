import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId } = await ctx.params;
    if (!emailId) {
      return NextResponse.json({ error: 'emailId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify the email belongs to the authenticated user
    const { data: email, error: emailErr } = await supabase
      .from('email_messages')
      .select('id')
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (emailErr || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Fetch attachments/documents linked to this email
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, filename, file_type, gcs_url, ocr_text, ocr_completed_at, created_at')
      .eq('email_id', emailId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to load attachments' }, { status: 500 });
    }

    return NextResponse.json({ attachments: docs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

