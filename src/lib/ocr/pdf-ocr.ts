import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';

export async function ocrPdfFromGCS(
  visionClient: ImageAnnotatorClient,
  storage: Storage,
  bucketName: string,
  gcsSourceUri: string
): Promise<string> {
  const outputUri = `${gcsSourceUri}-output/`;

  const inputConfig = { gcsSource: { uri: gcsSourceUri }, mimeType: 'application/pdf' };
  const outputConfig = { gcsDestination: { uri: outputUri }, batchSize: 1 } as protos.google.cloud.vision.v1.IOutputConfig;
  const features: protos.google.cloud.vision.v1.IFeature[] = [{ type: 'DOCUMENT_TEXT_DETECTION' }];

  const [operation] = await visionClient.asyncBatchAnnotateFiles({
    requests: [{ inputConfig, features, outputConfig }],
  });

  if (!operation?.name) throw new Error('Failed to start PDF OCR operation');

  // Poll for completion (simple polling with delay)
  let done = false;
  let attempts = 0;
  while (!done && attempts < 40) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await visionClient.checkAsyncBatchAnnotateFilesProgress(operation.name);
    if (status.done) {
      if (status.error) throw new Error(status.error.message);
      done = true;
    }
    attempts++;
  }

  if (!done) throw new Error('PDF OCR timed out');

  // Read output JSONs and concat text
  const prefix = outputUri.replace(`gs://${bucketName}/`, '');
  const [files] = await storage.bucket(bucketName).getFiles({ prefix });
  let fullText = '';
  for (const file of files) {
    const [output] = await file.download();
    const result = JSON.parse(output.toString());
    for (const response of result.responses) {
      fullText += response.fullTextAnnotation?.text || '';
    }
  }

  // Cleanup GCS outputs (best effort)
  try {
    for (const file of files) {
      await file.delete();
    }
    const sourceFilename = prefix.replace('-output/', '');
    await storage.bucket(bucketName).file(sourceFilename).delete({ ignoreNotFound: true } as any);
  } catch {
    // ignore
  }

  return fullText;
}

