import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = 'possible-point-477719-n3-pdfs';

const visionClient = new ImageAnnotatorClient();
const storage = new Storage();

async function processImage(buffer: Buffer): Promise<string> {
  const [result] = await visionClient.textDetection({
    image: { content: buffer },
  });
  const texts = result.textAnnotations;
  if (result.error?.message) {
    throw new Error(result.error.message);
  }
  return texts?.[0]?.description ?? 'No text found.';
}

async function startPdfProcessing(filePath: string, filename: string): Promise<string> {
  // Upload to GCS
  await storage.bucket(BUCKET_NAME).upload(filePath, {
    destination: filename,
  });
  // Clean up local temp file
  await fs.unlink(filePath);

  const gcsSourceUri = `gs://${BUCKET_NAME}/${filename}`;

  const inputConfig = {
    gcsSource: { uri: gcsSourceUri },
    mimeType: 'application/pdf',
  };

  const gcsDestinationUri = `gs://${BUCKET_NAME}/${filename}-output/`;
  const outputConfig = {
    gcsDestination: { uri: gcsDestinationUri },
    batchSize: 1,
  };

  const features: protos.google.cloud.vision.v1.IFeature[] = [{ type: 'DOCUMENT_TEXT_DETECTION' }];

  const [operation] = await visionClient.asyncBatchAnnotateFiles({
    requests: [{ inputConfig, features, outputConfig }],
  });

  const operationName = operation.name;
  if (!operationName || typeof operationName !== 'string' || operationName.length === 0) {
    throw new Error('Failed to start PDF processing job: Invalid operation name received.');
  }
  return operationName;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimetype = file.type;
    const filename = file.name;

    if (mimetype === 'application/pdf') {
      // Write buffer to a temporary file for GCS upload
      const tempFilePath = path.join(os.tmpdir(), filename);
      await fs.writeFile(tempFilePath, buffer);
      const jobId = await startPdfProcessing(tempFilePath, filename);
      return NextResponse.json({ jobId });
    } else {
      const extractedText = await processImage(buffer);
      return NextResponse.json({ text: extractedText });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
