import { google, docs_v1 } from 'googleapis';
import { getSupabaseServerClient } from '@/lib/db/client';
import { decryptToken } from '@/lib/encryption/token-encryption';

/**
 * Google Docs API client wrapper
 */
export class DocsClient {
  private docs: docs_v1.Docs;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    this.docs = google.docs({ version: 'v1', auth: oauth2Client });
    this.userId = userId;
  }

  /**
   * Create Docs client for a user
   */
  static async forUser(userId: string): Promise<DocsClient> {
    const supabase = getSupabaseServerClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('google_access_token')
      .eq('id', userId)
      .single();

    if (error || !user || !user.google_access_token) {
      throw new Error('User not found or no access token available');
    }

    const accessToken = decryptToken(user.google_access_token);

    return new DocsClient(accessToken, userId);
  }

  /**
   * Create a new Google Doc
   */
  async createDocument(title: string): Promise<docs_v1.Schema$Document> {
    const response = await this.docs.documents.create({
      requestBody: {
        title,
      },
    });

    return response.data;
  }

  /**
   * Get document content
   */
  async getDocument(documentId: string): Promise<docs_v1.Schema$Document> {
    const response = await this.docs.documents.get({
      documentId,
    });

    return response.data;
  }

  /**
   * Insert text at the beginning of the document
   */
  async insertText(documentId: string, text: string): Promise<void> {
    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text,
            },
          },
        ],
      },
    });
  }

  /**
   * Insert markdown-formatted text into document
   */
  async insertMarkdown(documentId: string, markdown: string): Promise<void> {
    // Simple markdown to Docs formatting
    // This is a basic implementation - can be enhanced
    const requests: docs_v1.Schema$Request[] = [];

    // Insert the text first
    requests.push({
      insertText: {
        location: { index: 1 },
        text: markdown,
      },
    });

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  /**
   * Share document with email address
   */
  async shareDocument(
    documentId: string,
    emailAddress: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader'
  ): Promise<void> {
    const drive = google.drive({
      version: 'v3',
      auth: this.docs.context._options.auth,
    });

    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: 'user',
        role,
        emailAddress,
      },
      sendNotificationEmail: true,
    });
  }

  /**
   * Get document URL
   */
  getDocumentUrl(documentId: string): string {
    return `https://docs.google.com/document/d/${documentId}/edit`;
  }
}
