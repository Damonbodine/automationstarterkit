import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';
import { queueDocumentOCR } from '@/lib/queue/queues';

export async function GET(_req: NextRequest, context: { params: Promise<{ emailId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { emailId } = await context.params;
  const supabase = getSupabaseServerClient();

  // Fetch documents for email
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, filename, file_type, gcs_url, ocr_text')
    .eq('user_id', userId)
    .eq('email_id', emailId);

  if (error) {
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }

  const texts: Array<{ documentId: string; filename: string; text: string }> = [];
  const pending: string[] = [];

  if (!docs || docs.length === 0) {
    return NextResponse.json({ texts: [], pending: [] });
  }

  const vision = new ImageAnnotatorClient();
  const storage = new Storage();

  for (const doc of docs) {
    if (doc.ocr_text && doc.ocr_text.length > 0) {
      texts.push({ documentId: doc.id, filename: doc.filename, text: doc.ocr_text });
      continue;
    }

    const mime = doc.file_type || '';
    const gcsUrl = doc.gcs_url as string | undefined;
    if (!gcsUrl) {
      pending.push(doc.id);
      continue;
    }

    try {
      if (mime.startsWith('image/')) {
        // Download from GCS and run textDetection inline
        const { bucket, path } = parseGcsUrl(gcsUrl);
        const [buffer] = await storage.bucket(bucket).file(path).download();
        const [result] = await vision.textDetection({ image: { content: buffer } });
        const text = result.textAnnotations?.[0]?.description || '';
        if (text) {
          await supabase.from('documents').update({ ocr_text: text, ocr_completed_at: new Date().toISOString() }).eq('id', doc.id);
          texts.push({ documentId: doc.id, filename: doc.filename, text });
          continue;
        }
      } else if (mime === 'application/pdf') {
        // Enqueue PDF OCR job (idempotent by jobId)
        if (gcsUrl) {
          await queueDocumentOCR({ documentId: doc.id, userId, gcsUrl, mimeType: mime });
        }
        pending.push(doc.id);
      } else {
        pending.push(doc.id);
      }
    } catch (e) {
      // Best-effort, mark pending on error
      pending.push(doc.id);
    }
  }

  return NextResponse.json({ texts, pending });
}

function parseGcsUrl(url: string): { bucket: string; path: string } {
  // gs://bucket/path/to/file
  const match = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error('Invalid GCS URL');
  return { bucket: match[1], path: match[2] };
}
