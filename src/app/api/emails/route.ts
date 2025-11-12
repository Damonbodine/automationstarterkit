import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('email_messages')
      .select(
        `
        *,
        email_classifications (
          category,
          priority,
          sentiment,
          tags,
          confidence_score
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', session.user.id)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (category) {
      query = query.eq('email_classifications.category', category as any);
    }

    if (priority) {
      query = query.eq('email_classifications.priority', priority as any);
    }

    const { data: emails, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      emails,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get emails error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
