import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { GmailComposer } from '@/lib/gmail/gmail-compose';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      googleDriveLinks,
    } = body;

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
        { error: 'Email body is required' },
        { status: 400 }
      );
    }

    const composer = await GmailComposer.forUser(session.user.id);

    const result = await composer.sendEmail({
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
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
