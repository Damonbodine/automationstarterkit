import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { GmailComposer } from '@/lib/gmail/gmail-compose';
import { getSupabaseServerClient } from '@/lib/db/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId } = await params;
    const body = await req.json();
    const { to, cc, bcc, subject, bodyText, bodyHtml, googleDriveLinks } = body;

    // Get original email to find Gmail ID
    const supabase = getSupabaseServerClient();
    const { data: email, error } = await supabase
      .from('email_messages')
      .select('gmail_id')
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Recipients (to) are required' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!bodyText && !bodyHtml) {
      return NextResponse.json(
        { error: 'Reply body is required' },
        { status: 400 }
      );
    }

    const composer = await GmailComposer.forUser(session.user.id);

    const result = await composer.replyToEmail({
      originalMessageId: email.gmail_id,
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      googleDriveLinks,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
    });
  } catch (error: any) {
    console.error('Error replying to email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reply to email' },
      { status: 500 }
    );
  }
}
