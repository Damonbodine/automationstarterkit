import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import type { Database } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Pull recent email IDs for this user
    const { data: emails, error: emailErr } = await supabase
      .from('email_messages')
      .select('id, subject, received_at')
      .eq('user_id', session.user.id)
      .order('received_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (emailErr) throw emailErr;
    type EmailRow = Pick<Database['public']['Tables']['email_messages']['Row'], 'id' | 'subject' | 'received_at'>;
    const emailRows: EmailRow[] = (emails as unknown as EmailRow[]) || [];
    const idToSubject = Object.fromEntries(emailRows.map((e) => [e.id, e.subject]));
    const emailIds = emailRows.map((e) => e.id);

    if (emailIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: classifications, error: classErr } = await supabase
      .from('email_classifications')
      .select('*')
      .in('email_id', emailIds)
      .order('classified_at', { ascending: false })
      .limit(20);

    if (classErr) throw classErr;

    type ClassRow = Database['public']['Tables']['email_classifications']['Row'];
    const classRows: ClassRow[] = (classifications as unknown as ClassRow[]) || [];
    const items = classRows.map((c) => ({
      ...c,
      subject: idToSubject[c.email_id] || null,
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch recent' }, { status: 500 });
  }
}
