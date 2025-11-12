import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { GmailComposer } from '@/lib/gmail/gmail-compose';
import { DriveClient } from '@/lib/google/drive-client';

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
      fileIds, // Array of Google Drive file IDs
      subject,
      message,
      shareWithRecipients = true, // Whether to also give Drive permissions
    } = body;

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Recipients (to) are required' },
        { status: 400 }
      );
    }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one file ID is required' },
        { status: 400 }
      );
    }

    const drive = await DriveClient.forUser(session.user.id);
    const composer = await GmailComposer.forUser(session.user.id);

    // Get file details and optionally share with recipients
    const files: Array<{
      fileId: string;
      fileName: string;
      fileUrl: string;
    }> = [];

    for (const fileId of fileIds) {
      const file = await drive.getFile(fileId);

      if (!file.id || !file.name || !file.webViewLink) {
        continue; // Skip invalid files
      }

      files.push({
        fileId: file.id,
        fileName: file.name,
        fileUrl: file.webViewLink,
      });

      // Share file with recipients if requested
      if (shareWithRecipients) {
        for (const email of to) {
          try {
            await drive.shareFile(fileId, email, 'reader');
          } catch (err) {
            console.error(`Failed to share file ${fileId} with ${email}:`, err);
            // Continue even if sharing fails
          }
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No valid files found' },
        { status: 400 }
      );
    }

    // Send email with file links
    let result;
    if (files.length === 1) {
      result = await composer.shareFileViaEmail({
        to,
        cc,
        fileId: files[0].fileId,
        fileName: files[0].fileName,
        fileUrl: files[0].fileUrl,
        subject,
        message,
      });
    } else {
      result = await composer.shareMultipleFilesViaEmail({
        to,
        cc,
        files,
        subject: subject || `Shared ${files.length} files`,
        message,
      });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
      sharedFiles: files.length,
    });
  } catch (error: any) {
    console.error('Error sharing files via email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to share files' },
      { status: 500 }
    );
  }
}
