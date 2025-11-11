import { google, sheets_v4, drive_v3 } from 'googleapis';
import { getSupabaseServerClient } from '@/lib/db/client';
import { decryptToken } from '@/lib/encryption/token-encryption';

/**
 * Google Sheets API client wrapper
 */
export class SheetsClient {
  private sheets: sheets_v4.Sheets;
  private drive: drive_v3.Drive;
  private userId: string;
  private oauth2Client: any;

  constructor(accessToken: string, userId: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.userId = userId;
  }

  /** Create a Sheets client for a user */
  static async forUser(userId: string): Promise<SheetsClient> {
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
    return new SheetsClient(accessToken, userId);
  }

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(
    title: string,
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
      },
      fields: 'spreadsheetId,spreadsheetUrl',
    });

    const spreadsheetId = response.data.spreadsheetId!;

    // Move to folder if specified
    if (folderId) {
      await this.drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        fields: 'id, parents',
      });
    }

    return {
      spreadsheetId,
      spreadsheetUrl: response.data.spreadsheetUrl!,
    };
  }

  /**
   * Create a spreadsheet from a template by copying it
   */
  async createFromTemplate(
    templateId: string,
    title: string,
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const requestBody: drive_v3.Schema$File = {
      name: title,
    };

    if (folderId) {
      requestBody.parents = [folderId];
    }

    const response = await this.drive.files.copy({
      fileId: templateId,
      requestBody,
      fields: 'id, webViewLink',
    });

    return {
      spreadsheetId: response.data.id!,
      spreadsheetUrl: response.data.webViewLink!,
    };
  }

  /**
   * Get values from a range
   */
  async getValues(
    spreadsheetId: string,
    range: string
  ): Promise<any[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  }

  /**
   * Get multiple ranges at once
   */
  async batchGetValues(
    spreadsheetId: string,
    ranges: string[]
  ): Promise<{ [range: string]: any[][] }> {
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    const result: { [range: string]: any[][] } = {};
    response.data.valueRanges?.forEach((vr) => {
      if (vr.range) {
        result[vr.range] = vr.values || [];
      }
    });

    return result;
  }

  /** Append a row to a named sheet */
  async appendRow(
    spreadsheetId: string,
    sheetName: string,
    values: any[]
  ): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
  }

  /** Update a range with values */
  async updateCells(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  /**
   * Batch update multiple ranges efficiently
   */
  async batchUpdateValues(
    spreadsheetId: string,
    updates: Array<{ range: string; values: any[][] }>
  ): Promise<void> {
    const data = updates.map((update) => ({
      range: update.range,
      values: update.values,
    }));

    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });
  }

  /**
   * Batch update with formatting and other requests
   */
  async batchUpdate(
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[]
  ): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  /**
   * Clear a range
   */
  async clearRange(spreadsheetId: string, range: string): Promise<void> {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }

  /**
   * Add a new sheet to the spreadsheet
   */
  async addSheet(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<number> {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      },
    });

    const sheetId =
      response.data.replies?.[0]?.addSheet?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) {
      throw new Error('Failed to create sheet');
    }

    return sheetId;
  }

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheet(
    spreadsheetId: string
  ): Promise<sheets_v4.Schema$Spreadsheet> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'spreadsheetId,properties,sheets',
    });

    return response.data;
  }
}

