import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ids = (body.ids as string[]) || [];
    const op = body.op as 'markRead' | 'markUnread' | 'archive' | 'delete' | 'spam' | 'star' | 'unstar';
    if (!ids.length || !op) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const supabase = getSupabaseServerClient();

    if (op === 'markRead') {
      const { error } = await supabase
        .from('email_messages')
        .update({ is_read: true })
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;
    } else if (op === 'markUnread') {
      const { error } = await supabase
        .from('email_messages')
        .update({ is_read: false })
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;
    } else if (op === 'star') {
      const { error } = await supabase
        .from('email_messages')
        .update({ is_starred: true })
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;
    } else if (op === 'unstar') {
      const { error } = await supabase
        .from('email_messages')
        .update({ is_starred: false })
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;
    } else if (op === 'archive') {
      // Simple archive: remove INBOX label in our DB. A true archive would call Gmail API.
      const { data: rows, error } = await supabase
        .from('email_messages')
        .select('id, labels')
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;

      // Update each email to remove INBOX label
      for (const row of rows || []) {
        const newLabels = Array.isArray(row.labels)
          ? row.labels.filter((l: string) => l !== 'INBOX')
          : row.labels;

        const { error: upErr } = await supabase
          .from('email_messages')
          .update({ labels: newLabels })
          .eq('id', row.id)
          .eq('user_id', session.user.id);

        if (upErr) throw upErr;
      }
    } else if (op === 'delete') {
      // Soft delete by adding TRASH label
      const { data: rows, error } = await supabase
        .from('email_messages')
        .select('id, labels')
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;

      for (const row of rows || []) {
        const newLabels = Array.isArray(row.labels)
          ? [...row.labels.filter((l: string) => l !== 'INBOX'), 'TRASH']
          : ['TRASH'];

        const { error: upErr } = await supabase
          .from('email_messages')
          .update({ labels: newLabels })
          .eq('id', row.id)
          .eq('user_id', session.user.id);

        if (upErr) throw upErr;
      }
    } else if (op === 'spam') {
      // Mark as spam by adding SPAM label
      const { data: rows, error } = await supabase
        .from('email_messages')
        .select('id, labels')
        .in('id', ids)
        .eq('user_id', session.user.id);
      if (error) throw error;

      for (const row of rows || []) {
        const newLabels = Array.isArray(row.labels)
          ? [...row.labels.filter((l: string) => l !== 'INBOX'), 'SPAM']
          : ['SPAM'];

        const { error: upErr } = await supabase
          .from('email_messages')
          .update({ labels: newLabels })
          .eq('id', row.id)
          .eq('user_id', session.user.id);

        if (upErr) throw upErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Bulk email op failed:', e);
    return NextResponse.json({ error: e?.message || 'Bulk op failed' }, { status: 500 });
  }
}

