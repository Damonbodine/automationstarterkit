import { google, drive_v3 } from 'googleapis';
import { getSupabaseServerClient } from '@/lib/db/client';
import { decryptToken } from '@/lib/encryption/token-encryption';

/**
 * Google Drive API client wrapper
 */
export class DriveClient {
  private drive: drive_v3.Drive;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    this.userId = userId;
  }

  /**
   * Create Drive client for a user
   */
  static async forUser(userId: string): Promise<DriveClient> {
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

    return new DriveClient(accessToken, userId);
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(
    name: string,
    parentFolderId?: string
  ): Promise<drive_v3.Schema$File> {
    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    });

    return response.data;
  }

  /**
   * Move file to folder
   */
  async moveFile(fileId: string, folderId: string): Promise<void> {
    // Get current parents
    const file = await this.drive.files.get({
      fileId,
      fields: 'parents',
    });

    const previousParents = file.data.parents?.join(',');

    await this.drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
  }

  /**
   * Share file with email address
   */
  async shareFile(
    fileId: string,
    emailAddress: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader'
  ): Promise<void> {
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role,
        emailAddress,
      },
      sendNotificationEmail: true,
    });
  }

  /**
   * List files in folder
   */
  async listFiles(folderId?: string): Promise<drive_v3.Schema$File[]> {
    let query = 'trashed = false';

    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    return response.data.files || [];
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<drive_v3.Schema$File> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, webViewLink, createdTime, modifiedTime',
    });

    return response.data;
  }
}
