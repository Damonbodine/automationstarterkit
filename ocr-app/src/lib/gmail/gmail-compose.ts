import { gmail_v1, google } from 'googleapis';
import { getSupabaseServerClient } from '@/lib/db/client';
import { decryptToken } from '@/lib/encryption/token-encryption';

/**
 * Gmail composer client for sending emails with attachments and links
 */
export class GmailComposer {
  private gmail: gmail_v1.Gmail;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    this.userId = userId;
  }

  /**
   * Create Gmail composer for a user
   */
  static async forUser(userId: string): Promise<GmailComposer> {
    const supabase = getSupabaseServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('google_access_token')
      .eq('id', userId)
      .single();

    if (error || !user?.google_access_token) {
      throw new Error('User not found or no access token available');
    }

    const accessToken = decryptToken(user.google_access_token);
    return new GmailComposer(accessToken, userId);
  }

  /**
   * Create a MIME message for email
   */
  private createMimeMessage(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    inReplyTo?: string;
    references?: string;
    googleDriveLinks?: Array<{
      fileId: string;
      fileName: string;
      fileUrl: string;
    }>;
  }): string {
    const boundary = '____BOUNDARY____';
    const nl = '\r\n';

    let message = '';

    // Headers
    message += `To: ${params.to.join(', ')}${nl}`;
    if (params.cc && params.cc.length > 0) {
      message += `Cc: ${params.cc.join(', ')}${nl}`;
    }
    if (params.bcc && params.bcc.length > 0) {
      message += `Bcc: ${params.bcc.join(', ')}${nl}`;
    }
    message += `Subject: ${params.subject}${nl}`;

    // Threading headers for replies
    if (params.inReplyTo) {
      message += `In-Reply-To: ${params.inReplyTo}${nl}`;
    }
    if (params.references) {
      message += `References: ${params.references}${nl}`;
    }

    message += `MIME-Version: 1.0${nl}`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"${nl}`;
    message += nl;

    // Plain text part
    if (params.bodyText) {
      message += `--${boundary}${nl}`;
      message += `Content-Type: text/plain; charset="UTF-8"${nl}`;
      message += nl;
      message += params.bodyText;
      message += nl;
    }

    // HTML part
    let htmlBody = params.bodyHtml || params.bodyText?.replace(/\n/g, '<br>') || '';

    // Append Google Drive links section if any
    if (params.googleDriveLinks && params.googleDriveLinks.length > 0) {
      htmlBody += '<br><br><hr><p><strong>Shared Files:</strong></p><ul>';
      for (const link of params.googleDriveLinks) {
        htmlBody += `<li><a href="${link.fileUrl}">${link.fileName}</a></li>`;
      }
      htmlBody += '</ul>';
    }

    message += `--${boundary}${nl}`;
    message += `Content-Type: text/html; charset="UTF-8"${nl}`;
    message += nl;
    message += htmlBody;
    message += nl;

    message += `--${boundary}--`;

    return message;
  }

  /**
   * Send an email
   */
  async sendEmail(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    googleDriveLinks?: Array<{
      fileId: string;
      fileName: string;
      fileUrl: string;
    }>;
  }): Promise<{ messageId: string; threadId: string }> {
    const mimeMessage = this.createMimeMessage(params);

    // Encode message in base64url
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      messageId: response.data.id!,
      threadId: response.data.threadId!,
    };
  }

  /**
   * Reply to an email
   */
  async replyToEmail(params: {
    originalMessageId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    googleDriveLinks?: Array<{
      fileId: string;
      fileName: string;
      fileUrl: string;
    }>;
  }): Promise<{ messageId: string; threadId: string }> {
    // Get original message to get threadId and headers
    const originalMessage = await this.gmail.users.messages.get({
      userId: 'me',
      id: params.originalMessageId,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'References'],
    });

    const headers = originalMessage.data.payload?.headers || [];
    const messageIdHeader = headers.find((h) => h.name === 'Message-ID')?.value;
    const referencesHeader = headers.find((h) => h.name === 'References')?.value;

    // Build references string
    let references = messageIdHeader || '';
    if (referencesHeader) {
      references = `${referencesHeader} ${messageIdHeader}`;
    }

    const mimeMessage = this.createMimeMessage({
      ...params,
      inReplyTo: messageIdHeader || undefined,
      references: references || undefined,
    });

    // Encode message in base64url
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: originalMessage.data.threadId,
      },
    });

    return {
      messageId: response.data.id!,
      threadId: response.data.threadId!,
    };
  }

  /**
   * Share a Google Drive file via email
   */
  async shareFileViaEmail(params: {
    to: string[];
    cc?: string[];
    fileId: string;
    fileName: string;
    fileUrl: string;
    subject?: string;
    message?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const subject = params.subject || `Shared: ${params.fileName}`;
    const bodyText =
      params.message ||
      `I've shared "${params.fileName}" with you.\n\nView file: ${params.fileUrl}`;

    return this.sendEmail({
      to: params.to,
      cc: params.cc,
      subject,
      bodyText,
      googleDriveLinks: [
        {
          fileId: params.fileId,
          fileName: params.fileName,
          fileUrl: params.fileUrl,
        },
      ],
    });
  }

  /**
   * Share multiple Google Drive files via email
   */
  async shareMultipleFilesViaEmail(params: {
    to: string[];
    cc?: string[];
    files: Array<{
      fileId: string;
      fileName: string;
      fileUrl: string;
    }>;
    subject: string;
    message?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const fileList = params.files.map((f) => `- ${f.fileName}`).join('\n');
    const bodyText =
      params.message ||
      `I've shared ${params.files.length} file(s) with you:\n\n${fileList}`;

    return this.sendEmail({
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      bodyText,
      googleDriveLinks: params.files,
    });
  }
}
