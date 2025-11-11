import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';
import { getSupabaseServerClient } from '@/lib/db/client';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'possible-point-477719-n3-pdfs';

const visionClient = new ImageAnnotatorClient();
const storage = new Storage();

async function ocrImage(buffer: Buffer): Promise<string> {
  const [result] = await visionClient.textDetection({ image: { content: buffer } });
  if (result.error?.message) throw new Error(result.error.message);
  const texts = result.textAnnotations;
  return texts?.[0]?.description ?? '';
}

async function uploadToGCS(buffer: Buffer, filename: string): Promise<string> {
  const tmp = path.join(os.tmpdir(), filename);
  await fs.writeFile(tmp, buffer);
  await storage.bucket(BUCKET_NAME).upload(tmp, { destination: filename });
  await fs.unlink(tmp);
  return `gs://${BUCKET_NAME}/${filename}`;
}

async function startPdfOCR(gcsSourceUri: string): Promise<string> {
  const outputUri = `${gcsSourceUri}-output/`;
  const inputConfig = { gcsSource: { uri: gcsSourceUri }, mimeType: 'application/pdf' };
  const outputConfig = { gcsDestination: { uri: outputUri }, batchSize: 1 };
  const features: protos.google.cloud.vision.v1.IFeature[] = [{ type: 'DOCUMENT_TEXT_DETECTION' }];
  const [operation] = await visionClient.asyncBatchAnnotateFiles({ requests: [{ inputConfig, features, outputConfig }] });
  if (!operation?.name) throw new Error('Failed to start PDF OCR operation');
  return operation.name;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const emailId = (formData.get('emailId') as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const mimeType = file.type;

    const supabase = getSupabaseServerClient();

    // Pre-create document record
    const { data: inserted, error: insertErr } = await supabase
      .from('documents')
      // @ts-ignore - Supabase type inference issue
      .insert({
        user_id: session.user.id,
        email_id: emailId,
        filename,
        file_type: mimeType,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // @ts-ignore - Supabase type inference issue
    const documentId = inserted.id;

    // Upload to GCS
    const gcsUri = await uploadToGCS(buffer, filename);

    // Update with GCS URL
    // @ts-ignore - Supabase type inference issue
    await supabase.from('documents').update({ gcs_url: gcsUri }).eq('id', documentId);

    if (mimeType === 'application/pdf') {
      // Start async OCR
      const jobId = await startPdfOCR(gcsUri);
      // Return job id so client can poll; include documentId for linking
      return NextResponse.json({ jobId, documentId });
    } else {
      // Synchronous OCR for images
      const text = await ocrImage(buffer);
      await supabase
        .from('documents')
        // @ts-ignore - Supabase type inference issue
        .update({ ocr_text: text, ocr_completed_at: new Date().toISOString() })
        .eq('id', documentId);
      return NextResponse.json({ documentId, text });
    }
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

