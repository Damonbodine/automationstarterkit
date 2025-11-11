import { GmailClient } from '@/lib/gmail/gmail-client';
import { getSupabaseServerClient } from '@/lib/db/client';
import { queueEmailClassification } from '@/lib/queue/queues';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';

/**
 * Sync emails for a user
 */
export async function syncEmails(userId: string, fullSync = false): Promise<{
  synced: number;
  errors: number;
}> {
  const supabase = getSupabaseServerClient();
  const visionClient = new ImageAnnotatorClient();
  const storage = new Storage();
  const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'possible-point-477719-n3-pdfs';

  try {
    // Get sync state
    const { data: syncState } = await supabase
      .from('email_sync_state')
      .select('last_history_id, last_sync_at, total_emails_synced')
      .eq('user_id', userId)
      .single();

    const gmailClient = await GmailClient.forUser(userId);

    let synced = 0;
    let errors = 0;

    if (fullSync || !syncState?.last_history_id) {
      // Full sync: fetch all recent emails
      let pageToken: string | undefined;
      const maxEmails = 500; // Limit for initial sync

      do {
        const { messages, nextPageToken } = await gmailClient.listMessages({
          maxResults: 100,
          pageToken,
          q: 'in:inbox',
        });

        if (messages.length === 0) break;

        // Fetch full message details
        const fullMessages = await gmailClient.batchGetMessages(
          messages.map((m) => m.id!).filter(Boolean)
        );

        // Save to database and process attachments
        for (const message of fullMessages) {
          try {
            const emailId = await saveEmail(userId, message);
            synced++;

            // Queue for classification
            if (emailId) {
              await queueEmailClassification(emailId, userId);
            }

            // Process attachments (OCR + persist to documents)
            if (message.payload) {
              await processAttachments({
                userId,
                emailId,
                messageId: message.id!,
                payload: message.payload,
                gmailClient,
                storage,
                visionClient,
                bucket: BUCKET_NAME,
              });
            }
          } catch (error) {
            console.error(`Error saving email ${message.id}:`, error);
            errors++;
          }
        }

        pageToken = nextPageToken;

        if (synced >= maxEmails) break;
      } while (pageToken);

      // Get current profile for history ID
      const profile = await gmailClient.gmail.users.getProfile({
        userId: 'me',
      });

      if (profile.data.historyId) {
        await supabase
          .from('email_sync_state')
          .update({
            last_history_id: profile.data.historyId,
            last_sync_at: new Date().toISOString(),
            total_emails_synced: synced,
          })
          .eq('user_id', userId);
      }
    } else {
      // Incremental sync using history
      const { history, historyId } = await gmailClient.getHistory(
        syncState.last_history_id
      );

      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const added of historyItem.messagesAdded) {
            if (!added.message?.id) continue;

            try {
              const message = await gmailClient.getMessage(added.message.id);
              const emailId = await saveEmail(userId, message);
              synced++;

              // Queue for classification
              if (emailId) {
                await queueEmailClassification(emailId, userId);
              }

              // Process attachments
              if (message.payload) {
                await processAttachments({
                  userId,
                  emailId,
                  messageId: message.id!,
                  payload: message.payload,
                  gmailClient,
                  storage,
                  visionClient,
                  bucket: BUCKET_NAME,
                });
              }
            } catch (error) {
              console.error(`Error syncing email ${added.message.id}:`, error);
              errors++;
            }
          }
        }

        if (historyItem.messagesDeleted) {
          for (const deleted of historyItem.messagesDeleted) {
            if (!deleted.message?.id) continue;

            await supabase
              .from('email_messages')
              .delete()
              .eq('gmail_id', deleted.message.id)
              .eq('user_id', userId);
          }
        }
      }

      // Update sync state
      if (historyId) {
        await supabase
          .from('email_sync_state')
          .update({
            last_history_id: historyId,
            last_sync_at: new Date().toISOString(),
            total_emails_synced: (syncState?.total_emails_synced || 0) + synced,
          })
          .eq('user_id', userId);
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('Email sync error:', error);

    // Update sync state with error
    await supabase
      .from('email_sync_state')
      .update({
        sync_status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('user_id', userId);

    throw error;
  }
}

/**
 * Save email to database
 */
async function saveEmail(userId: string, message: any): Promise<string | null> {
  const supabase = getSupabaseServerClient();

  const headers = GmailClient.parseHeaders(message);
  const body = GmailClient.extractBody(message);

  await supabase.from('email_messages').upsert({
    user_id: userId,
    gmail_id: message.id,
    thread_id: message.threadId,
    subject: headers.subject,
    from_email: headers.from,
    from_name: headers.fromName,
    to_email: headers.to,
    body_plain: body.plain,
    body_html: body.html,
    snippet: message.snippet,
    has_attachments: (message.payload?.parts || []).some(
      (part: any) => part.filename && part.filename.length > 0
    ),
    is_read: !message.labelIds?.includes('UNREAD'),
    is_starred: message.labelIds?.includes('STARRED') || false,
    labels: message.labelIds || [],
    received_at: headers.date ? new Date(headers.date).toISOString() : null,
  });

  // Return email id
  const { data: saved } = await supabase
    .from('email_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('gmail_id', message.id)
    .single();

  return saved?.id ?? null;
}

/**
 * Extract attachments from Gmail message payload
 */
function extractAttachments(payload: any): Array<{
  filename: string;
  mimeType: string;
  attachmentId: string;
}> {
  const attachments: Array<{ filename: string; mimeType: string; attachmentId: string }> = [];

  const walk = (part: any) => {
    if (!part) return;
    if (part.filename && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(walk);
    }
  };

  if (payload.parts) payload.parts.forEach(walk);
  return attachments;
}

/**
 * Upload buffer to GCS and return gs:// URL
 */
async function uploadToGCS(storage: Storage, bucket: string, path: string, buffer: Buffer): Promise<string> {
  const file = storage.bucket(bucket).file(path);
  await file.save(buffer, { resumable: false, public: false });
  return `gs://${bucket}/${path}`;
}

/**
 * Process attachments: save to GCS, create document row, OCR content
 */
async function processAttachments(args: {
  userId: string;
  emailId: string | null;
  messageId: string;
  payload: any;
  gmailClient: GmailClient;
  storage: Storage;
  visionClient: ImageAnnotatorClient;
  bucket: string;
}) {
  const { userId, emailId, messageId, payload, gmailClient, storage, visionClient, bucket } = args;
  const supabase = getSupabaseServerClient();
  const attachments = extractAttachments(payload);

  for (const att of attachments) {
    try {
      // Download attachment data
      const data = await gmailClient.getAttachment(messageId, att.attachmentId);
      const base64 = (data.data || '').replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(base64, 'base64');

      // Upload to GCS with deterministic path
      const safeName = att.filename || 'attachment';
      const gcsPath = `${userId}/${messageId}/${safeName}`;
      const gcsUrl = await uploadToGCS(storage, bucket, gcsPath, buffer);

      // Create document record
      const { data: docRow } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          email_id: emailId,
          filename: safeName,
          file_type: att.mimeType,
          gcs_url: gcsUrl,
        })
        .select('id')
        .single();

      const documentId = docRow?.id as string | undefined;

      // OCR based on mime type
      let ocrText: string | null = null;
      if (att.mimeType === 'application/pdf') {
        ocrText = await ocrPdfFromGCS(visionClient, storage, bucket, gcsUrl);
      } else if (att.mimeType?.startsWith('image/')) {
        const [result] = await visionClient.textDetection({ image: { content: buffer } });
        if (result.error?.message) throw new Error(result.error.message);
        ocrText = result.textAnnotations?.[0]?.description || null;
      }

      if (documentId && ocrText !== null) {
        await supabase
          .from('documents')
          .update({ ocr_text: ocrText, ocr_completed_at: new Date().toISOString() })
          .eq('id', documentId);
      }
    } catch (e) {
      console.error('Attachment processing failed:', e);
      // Continue with other attachments
    }
  }
}

async function ocrPdfFromGCS(
  visionClient: ImageAnnotatorClient,
  storage: Storage,
  bucketName: string,
  gcsSourceUri: string
): Promise<string> {
  const outputUri = `${gcsSourceUri}-output/`;

  const inputConfig = { gcsSource: { uri: gcsSourceUri }, mimeType: 'application/pdf' };
  const outputConfig = { gcsDestination: { uri: outputUri }, batchSize: 1 };
  const features: protos.google.cloud.vision.v1.IFeature[] = [{ type: 'DOCUMENT_TEXT_DETECTION' }];

  const [operation] = await visionClient.asyncBatchAnnotateFiles({
    requests: [{ inputConfig, features, outputConfig }],
  });

  if (!operation?.name) throw new Error('Failed to start PDF OCR operation');

  // Poll for completion (simple polling with delay)
  let done = false;
  let attempts = 0;
  while (!done && attempts < 40) { // up to ~2 minutes
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
  } catch (cleanupErr) {
    console.warn('Failed to cleanup OCR artifacts:', cleanupErr);
  }

  return fullText;
}
