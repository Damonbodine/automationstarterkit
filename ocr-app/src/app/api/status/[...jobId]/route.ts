import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = 'possible-point-477719-n3-pdfs';

const visionClient = new ImageAnnotatorClient();
const storage = new Storage();

async function getPdfText(gcsOutputUri: string): Promise<string> {
  const prefix = gcsOutputUri.replace(`gs://${BUCKET_NAME}/`, '');
  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix });

  let fullText = '';
  for (const file of files) {
    const [output] = await file.download();
    const result = JSON.parse(output.toString());
    for (const response of result.responses) {
      fullText += response.fullTextAnnotation.text;
    }
  }

  // Cleanup GCS files
  const sourceFilename = prefix.replace('-output/', '');
  await storage.bucket(BUCKET_NAME).file(sourceFilename).delete();
  for (const file of files) {
    await file.delete();
  }

  return fullText;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string[] }> }
) {
  try {
    const { jobId } = await context.params;
    
    if (!jobId || jobId.length === 0) {
      return NextResponse.json({ error: 'Job ID is required.' }, { status: 400 });
    }
    
    const operationName = jobId.join('/');
    
    const operation = await visionClient.checkAsyncBatchAnnotateFilesProgress(operationName);

    if (operation.done) {
      if (operation.error) {
        throw new Error(operation.error.message);
      }
      
      // The parsed result is in the `result` property
      const result = operation.result as protos.google.cloud.vision.v1.IAsyncBatchAnnotateFilesResponse;
      const gcsOutputUri = result.responses?.[0]?.outputConfig?.gcsDestination?.uri;

      if (!gcsOutputUri) {
        throw new Error('Could not find output URI in the operation response.');
      }

      const text = await getPdfText(gcsOutputUri);
      return NextResponse.json({ status: 'done', text });
    } else {
      return NextResponse.json({ status: 'processing' });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}