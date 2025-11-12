import { google, gmail_v1 } from 'googleapis';
import { getSupabaseServerClient } from '@/lib/db/client';
import { decryptToken, encryptToken } from '@/lib/encryption/token-encryption';

/**
 * Rate limiter for Gmail API requests
 * Limits to 10 requests per second per user
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequestsPerSecond: number;

  constructor(maxRequestsPerSecond = 10) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
  }

  async acquire(userId: string): Promise<void> {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove requests older than 1 second
    const recentRequests = userRequests.filter((time) => now - time < 1000);

    if (recentRequests.length >= this.maxRequestsPerSecond) {
      // Wait until oldest request is more than 1 second old
      const oldestRequest = recentRequests[0];
      const waitTime = 1000 - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire(userId);
    }

    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
  }
}

const rateLimiter = new RateLimiter(
  parseInt(process.env.GMAIL_API_RATE_LIMIT || '10', 10)
);

/**
 * Gmail API client wrapper
 */
export class GmailClient {
  public gmail: gmail_v1.Gmail;
  private userId: string;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor(accessToken: string, userId: string, refreshToken?: string | null) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    this.userId = userId;
    this.oauth2Client = oauth2Client;

    // Persist refreshed tokens
    this.oauth2Client.on('tokens', async (tokens) => {
      try {
        const supabase = getSupabaseServerClient();

        const updates: Record<string, string | null> = {};
        if (tokens.access_token) {
          updates.google_access_token = encryptToken(tokens.access_token);
        }
        if (tokens.refresh_token) {
          updates.google_refresh_token = encryptToken(tokens.refresh_token);
        }

        if (Object.keys(updates).length) {
          await supabase
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', this.userId);
        }
      } catch (err) {
        console.error('Failed to persist refreshed Google tokens:', err);
      }
    });
  }

  /**
   * Create Gmail client for a user
   */
  static async forUser(userId: string): Promise<GmailClient> {
    const supabase = getSupabaseServerClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token')
      .eq('id', userId)
      .single();

    if (error || !user || !user.google_access_token) {
      throw new Error('User not found or no access token available');
    }

    const accessToken = decryptToken(user.google_access_token);
    const refreshToken = user.google_refresh_token
      ? decryptToken(user.google_refresh_token)
      : undefined;

    return new GmailClient(accessToken, userId, refreshToken);
  }

  /**
   * List messages with pagination
   */
  async listMessages(options: {
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
  } = {}): Promise<{
    messages: gmail_v1.Schema$Message[];
    nextPageToken?: string;
  }> {
    await rateLimiter.acquire(this.userId);

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults: options.maxResults || 100,
      pageToken: options.pageToken,
      q: options.q,
      labelIds: options.labelIds,
    });

    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  /**
   * Get full message details
   */
  async getMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    await rateLimiter.acquire(this.userId);

    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return response.data;
  }

  /**
   * Get attachment data for a message part
   */
  async getAttachment(messageId: string, attachmentId: string) {
    await rateLimiter.acquire(this.userId);
    const response = await this.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    return response.data;
  }

  /**
   * Batch get messages
   */
  async batchGetMessages(messageIds: string[]): Promise<gmail_v1.Schema$Message[]> {
    const messages: gmail_v1.Schema$Message[] = [];

    // Process in batches of 10 to respect rate limits
    for (let i = 0; i < messageIds.length; i += 10) {
      const batch = messageIds.slice(i, i + 10);
      const batchMessages = await Promise.all(
        batch.map((id) => this.getMessage(id))
      );
      messages.push(...batchMessages);
    }

    return messages;
  }

  /**
   * Get message history (for incremental sync)
   */
  async getHistory(startHistoryId: string): Promise<{
    history: gmail_v1.Schema$History[];
    historyId?: string;
  }> {
    await rateLimiter.acquire(this.userId);

    const response = await this.gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded', 'messageDeleted'],
    });

    return {
      history: response.data.history || [],
      historyId: response.data.historyId ?? undefined,
    };
  }

  /**
   * Watch for Gmail push notifications
   */
  async watch(topicName: string): Promise<gmail_v1.Schema$WatchResponse> {
    await rateLimiter.acquire(this.userId);

    const response = await this.gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'],
      },
    });

    return response.data;
  }

  /**
   * Stop watching for Gmail push notifications
   */
  async stopWatch(): Promise<void> {
    await rateLimiter.acquire(this.userId);

    await this.gmail.users.stop({
      userId: 'me',
    });
  }

  /**
   * Modify message labels
   */
  async modifyMessage(
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<gmail_v1.Schema$Message> {
    await rateLimiter.acquire(this.userId);

    const response = await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });

    return response.data;
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, undefined, ['UNREAD']);
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, ['UNREAD'], undefined);
  }

  /**
   * Parse email headers
   */
  static parseHeaders(message: gmail_v1.Schema$Message): {
    from?: string;
    fromName?: string;
    to?: string;
    subject?: string;
    date?: string;
  } {
    const headers = message.payload?.headers || [];

    const getHeader = (name: string): string | undefined => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      );
      return header?.value ?? undefined;
    };

    const fromHeader = getHeader('From') || '';
    const fromMatch = fromHeader.match(/^(.*?)\s*<(.+)>$/) || [null, fromHeader, fromHeader];

    return {
      from: fromMatch[2] || fromHeader,
      fromName: fromMatch[1]?.trim() || undefined,
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
    };
  }

  /**
   * Extract email body text
   */
  static extractBody(message: gmail_v1.Schema$Message): {
    plain?: string;
    html?: string;
  } {
    const payload = message.payload;
    if (!payload) return {};

    let plain: string | undefined;
    let html: string | undefined;

    const getPart = (part: gmail_v1.Schema$MessagePart): void => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        plain = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      if (part.parts) {
        part.parts.forEach(getPart);
      }
    };

    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/plain') {
        plain = decoded;
      } else if (payload.mimeType === 'text/html') {
        html = decoded;
      }
    }

    if (payload.parts) {
      payload.parts.forEach(getPart);
    }

    return { plain, html };
  }
}
