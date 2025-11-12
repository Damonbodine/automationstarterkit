import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { DriveClient } from '@/lib/google/drive-client';
import { DocsClient } from '@/lib/google/docs-client';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Document as AppDocument } from '@/types/ui';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const supabase = getSupabaseServerClient();

  try {
    const driveClient = await DriveClient.forUser(userId);
    const docsClient = await DocsClient.forUser(userId);
    const files = await driveClient.listFiles();

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No files found in Google Drive.' });
    }

    type NewDocument = {
      user_id: string;
      filename: string;
      source_type: string;
      gdrive_file_id: string;
      webviewlink?: string;
      file_type: string;
      content: string | null;
      created_at: string;
    };

    const newDocuments: NewDocument[] = [];

    for (const file of files) {
      if (!file.id || !file.name || !file.mimeType) continue;

      // Skip folders
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        continue;
      }

      // Check if the document already exists
      const { data: existingDoc, error: existingDocError } = await supabase
        .from('documents')
        .select('id')
        .eq('gdrive_file_id', file.id)
        .eq('user_id', userId)
        .single();

      if (existingDoc) {
        continue; // Skip if already exists
      }

      let content: string | null = null;
      // If it's a Google Doc, fetch its content
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const doc = await docsClient.getDocument(file.id);
        if (doc.body?.content) {
          content = doc.body.content.map(el => el.paragraph?.elements?.map(e => e.textRun?.content || '').join('') || '').join('\n');
        }
      }

      newDocuments.push({
        user_id: userId,
        filename: file.name,
        source_type: 'google_drive',
        gdrive_file_id: file.id,
        webviewlink: file.webViewLink ?? undefined,
        file_type: file.mimeType,
        content: content,
        created_at: new Date().toISOString(),
      });
    }

    if (newDocuments.length > 0) {
      const { error: insertError } = await supabase.from('documents').insert(newDocuments);
      if (insertError) {
        console.error('Error inserting documents:', insertError);
        return NextResponse.json({ error: 'Failed to save new documents.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: `Sync complete. Found ${files.length} files, added ${newDocuments.length} new documents.`,
    });
  } catch (error) {
    console.error('Error during Google Drive sync:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during sync.' }, { status: 500 });
  }
}