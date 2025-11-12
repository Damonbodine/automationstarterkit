import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import type { Database } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseServerClient();

    // Get recent email ids (cap for perf)
    const { data: emails } = await supabase
      .from('email_messages')
      .select('id')
      .eq('user_id', session.user.id)
      .order('received_at', { ascending: false })
      .limit(1000);

    const emailIds = (emails || []).map((e: any) => e.id);
    if (emailIds.length === 0) {
      return NextResponse.json({
        total: 0,
        byCategory: {},
        avgConfidence: null,
        corrections: 0,
        correctionRate: 0,
      });
    }

    const { data: cls } = await supabase
      .from('email_classifications')
      .select('email_id, category, confidence_score, user_feedback')
      .in('email_id', emailIds);

    type EmailCategory = Database['public']['Enums']['email_category'];
    type ClassificationRow = {
      email_id: string;
      category: EmailCategory | null;
      confidence_score: number | null;
      user_feedback: string | null;
    };

    const rows: ClassificationRow[] = (cls as unknown as ClassificationRow[]) || [];
    const byCategory: Record<string, number> = {};
    let confidenceSum = 0;
    let confidenceCount = 0;
    let corrections = 0;

    for (const row of rows) {
      if (row.category) byCategory[row.category] = (byCategory[row.category] || 0) + 1;
      if (typeof row.confidence_score === 'number') {
        confidenceSum += row.confidence_score;
        confidenceCount += 1;
      }
      if (row.user_feedback) corrections += 1;
    }

    const total = rows.length;
    const avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : null;
    const correctionRate = total > 0 ? corrections / total : 0;

    return NextResponse.json({ total, byCategory, avgConfidence, corrections, correctionRate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
