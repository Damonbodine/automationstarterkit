# Phase 2: Gmail Integration (Weeks 2-3)

**Timeline:** Weeks 2-3
**Priority:** P0 (Must Have)

---

## Overview

Integrate with Gmail API to sync emails in real-time, store them in the database, and process attachments. This phase establishes the core email management functionality.

---

## 2.1 Gmail API Client

**Priority:** P0 (Must Have)

### Requirements

- Gmail API initialization per user
- Automatic token refresh
- Rate limiting (10 req/sec per user)
- Quota management
- Error handling and retry logic

### Implementation

**Gmail Client Wrapper:**
```typescript
// lib/google/gmail.ts
import { google } from 'googleapis';

export class GmailClient {
  private gmail;

  constructor(accessToken: string, refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async listMessages(options) { /* ... */ }
  async getMessage(id) { /* ... */ }
  async getAttachment(messageId, attachmentId) { /* ... */ }
  async watchMailbox() { /* ... */ }
}
```

### Rate Limiting Strategy

- Use `bottleneck` library for rate limiting
- 10 requests/second per user
- Queue requests when limit exceeded
- Exponential backoff on 429 errors

### Token Refresh

- Detect 401 errors (expired token)
- Automatically refresh using refresh token
- Update access token in database
- Retry original request

### Acceptance Criteria

- [ ] Can fetch emails for authenticated users
- [ ] Token refresh works seamlessly
- [ ] Rate limits respected
- [ ] Graceful degradation on quota exceeded

---

## 2.2 Real-time Webhook System

**Priority:** P0 (Must Have)

### Architecture

```
Gmail → Pub/Sub → Webhook Endpoint → Verify → Queue → Process Email
```

### Google Cloud Pub/Sub Setup

1. Create Pub/Sub topic: `gmail-notifications`
2. Create push subscription to: `https://yourdomain.com/api/webhooks/gmail`
3. Set subscription filter (optional)
4. Configure authentication

### Webhook Endpoint Implementation

**Route:** `/api/webhooks/gmail`

```typescript
// app/api/webhooks/gmail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyPubSubMessage } from '@/lib/google/pubsub';
import { addEmailJob } from '@/lib/queue/email-processor';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Pub/Sub message signature
    const isValid = await verifyPubSubMessage(req);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Parse message
    const body = await req.json();
    const data = JSON.parse(
      Buffer.from(body.message.data, 'base64').toString()
    );

    // 3. Extract email address from data
    const emailAddress = data.emailAddress;

    // 4. Find user by email
    const user = await getUserByEmail(emailAddress);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 5. Add job to queue
    await addEmailJob({
      userId: user.id,
      historyId: data.historyId
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Message Verification

```typescript
// lib/google/pubsub.ts
import crypto from 'crypto';

export async function verifyPubSubMessage(req: NextRequest): Promise<boolean> {
  // Verify the message came from Google
  // Check the authorization header or use other verification methods
  // See: https://cloud.google.com/pubsub/docs/push#authentication

  const token = req.headers.get('authorization');
  // Implement verification logic
  return true; // Replace with actual verification
}
```

### Queue System (BullMQ)

```typescript
// lib/queue/email-processor.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);

export const emailQueue = new Queue('emails', { connection });

export async function addEmailJob(data: { userId: string; historyId: string }) {
  await emailQueue.add('fetch-email', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
}

// Worker
const worker = new Worker('emails', async (job) => {
  const { userId, historyId } = job.data;

  // Fetch new emails using Gmail API
  await fetchAndStoreEmails(userId, historyId);
}, { connection });
```

### Gmail Watch Setup

```typescript
// lib/google/gmail-watch.ts
export async function setupGmailWatch(userId: string) {
  const user = await getUser(userId);
  const gmail = new GmailClient(user.access_token, user.refresh_token);

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: 'projects/YOUR_PROJECT/topics/gmail-notifications',
      labelIds: ['INBOX']
    }
  });

  // Store the historyId
  await updateSyncState(userId, {
    last_history_id: response.data.historyId
  });
}
```

### Acceptance Criteria

- [ ] Webhooks trigger on new emails
- [ ] Messages verified for authenticity
- [ ] Processing queued for reliability
- [ ] Failed jobs retry with exponential backoff
- [ ] Dead letter queue for failures

---

## 2.3 Email Sync & Storage

**Priority:** P0 (Must Have)

### Initial Sync

**Flow:**
1. User connects Gmail account
2. Fetch last 30 days of emails
3. Store in `email_messages` table
4. Download attachments
5. Process PDFs with OCR
6. Update `email_sync_state`

**Implementation:**
```typescript
// lib/sync/initial-sync.ts
export async function performInitialSync(userId: string) {
  const user = await getUser(userId);
  const gmail = new GmailClient(user.access_token, user.refresh_token);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let pageToken: string | undefined;
  let totalProcessed = 0;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      pageToken,
      q: `after:${Math.floor(thirtyDaysAgo.getTime() / 1000)}`
    });

    const messages = response.data.messages || [];

    // Process messages in batches
    await Promise.all(
      messages.map(msg => fetchAndStoreEmail(userId, msg.id!))
    );

    totalProcessed += messages.length;
    pageToken = response.data.nextPageToken;

    // Update progress
    await updateSyncProgress(userId, totalProcessed);

  } while (pageToken);

  // Mark sync complete
  await updateSyncState(userId, {
    last_sync_at: new Date(),
    sync_status: 'active'
  });
}
```

### Incremental Sync

**Using Gmail History API:**
```typescript
export async function performIncrementalSync(userId: string) {
  const user = await getUser(userId);
  const syncState = await getSyncState(userId);
  const gmail = new GmailClient(user.access_token, user.refresh_token);

  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: syncState.last_history_id
  });

  const history = response.data.history || [];

  for (const item of history) {
    // Process added messages
    if (item.messagesAdded) {
      for (const added of item.messagesAdded) {
        await fetchAndStoreEmail(userId, added.message!.id!);
      }
    }

    // Handle deleted messages
    if (item.messagesDeleted) {
      for (const deleted of item.messagesDeleted) {
        await markEmailDeleted(userId, deleted.message!.id!);
      }
    }
  }

  // Update history ID
  await updateSyncState(userId, {
    last_history_id: response.data.historyId,
    last_sync_at: new Date()
  });
}
```

### Email Storage

```typescript
async function fetchAndStoreEmail(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);

  const message = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  const headers = message.data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find(h => h.name === name)?.value;

  // Extract email data
  const emailData = {
    user_id: userId,
    gmail_id: messageId,
    thread_id: message.data.threadId,
    subject: getHeader('Subject'),
    from_email: parseEmail(getHeader('From')),
    from_name: parseName(getHeader('From')),
    to_email: getHeader('To'),
    cc_emails: getHeader('Cc')?.split(',').map(e => e.trim()),
    body_plain: extractPlainText(message.data.payload),
    body_html: extractHtmlText(message.data.payload),
    has_attachments: hasAttachments(message.data.payload),
    received_at: new Date(parseInt(message.data.internalDate!))
  };

  // Store in database
  const email = await createEmail(emailData);

  // Process attachments
  if (emailData.has_attachments) {
    await processAttachments(userId, email.id, message.data.payload);
  }

  return email;
}
```

### Attachment Processing

```typescript
async function processAttachments(userId: string, emailId: string, payload: any) {
  const attachments = extractAttachments(payload);

  for (const attachment of attachments) {
    // Download attachment
    const data = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: payload.id,
      id: attachment.attachmentId
    });

    // Upload to GCS
    const buffer = Buffer.from(data.data.data!, 'base64');
    const gcsUrl = await uploadToGCS(buffer, attachment.filename);

    // Save document record
    const doc = await createDocument({
      user_id: userId,
      email_id: emailId,
      filename: attachment.filename,
      file_type: attachment.mimeType,
      gcs_url: gcsUrl
    });

    // OCR if PDF
    if (attachment.mimeType === 'application/pdf') {
      await queueOCRJob(doc.id);
    }
  }
}
```

### Acceptance Criteria

- [ ] Initial sync completes for mailboxes with 10,000+ emails
- [ ] New emails appear within 30 seconds
- [ ] PDF attachments auto-processed with OCR
- [ ] Email threads preserved
- [ ] Progress indicator for initial sync

---

## Testing Requirements

### Unit Tests
- Gmail API client methods
- Token refresh mechanism
- Rate limiting
- Email data extraction
- Attachment processing

### Integration Tests
- Initial sync with test Gmail account
- Webhook receiving and processing
- Incremental sync with history API
- Error handling and retries

### Load Tests
- Process 1,000+ emails
- Handle multiple concurrent users
- Queue processing under load

---

## Error Handling

### Common Errors

| Error | Code | Handling |
|-------|------|----------|
| Expired token | 401 | Refresh token automatically |
| Rate limit | 429 | Exponential backoff, retry |
| Quota exceeded | 403 | Pause sync, notify user |
| Invalid grant | 400 | Require re-authentication |
| Network error | - | Retry with backoff |

### Error Notification

- Log all errors to Sentry
- Update `email_sync_state` with error info
- Notify user of critical errors
- Admin dashboard shows sync health

---

## Performance Optimization

1. **Batch Processing**: Process 100 emails at a time
2. **Parallel Fetching**: Fetch multiple emails concurrently (limit 10)
3. **Caching**: Cache frequently accessed emails
4. **Selective Fields**: Only fetch required message fields
5. **Compression**: Compress email body in database

---

## Dependencies

**APIs:**
- Gmail API enabled
- Cloud Pub/Sub enabled
- Gmail watch set up per user

**Infrastructure:**
- Upstash Redis for BullMQ
- Google Cloud Storage for attachments
- Queue worker running continuously

---

## Deliverables

1. Gmail API client implemented
2. Webhook endpoint deployed
3. Initial sync working
4. Incremental sync via Pub/Sub
5. Attachment processing functional
6. Queue system operational
7. Tests passing

---

## Next Steps

After Phase 2 completion:
- Email data is syncing in real-time
- Ready for AI classification (Phase 3)
- Attachments available for processing
