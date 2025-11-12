import { getSupabaseServerClient } from '@/lib/db/client';
import { Template, TemplateData, TemplateType } from './template-types';
import { DEFAULT_TEMPLATES } from './default-templates';
import { DocsClient } from '@/lib/google/docs-client';
import { SheetsClient } from '@/lib/google/sheets-client';

/**
 * Template Manager for handling document and spreadsheet templates
 */
export class TemplateManager {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Get all available templates for a user (default + custom)
   */
  async getTemplates(type?: TemplateType): Promise<Template[]> {
    const supabase = getSupabaseServerClient();

    // Get default templates
    let templates = DEFAULT_TEMPLATES.map((t, idx) => ({
      ...t,
      id: `default-${idx}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Filter by type if specified
    if (type) {
      templates = templates.filter((t) => t.type === type);
    }

    // Get custom templates if user is specified
    if (this.userId) {
      const { data: customTemplates } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (customTemplates) {
        templates.push(
          ...customTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.type as TemplateType,
            description: t.description || '',
            content: t.content,
            variables: t.variables as any,
            googleDocTemplateId: t.google_doc_template_id || undefined,
            googleSheetTemplateId: t.google_sheet_template_id || undefined,
            isDefault: t.is_default,
            userId: t.user_id,
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
          }))
        );
      }
    }

    return templates;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    // Check if it's a default template
    if (templateId.startsWith('default-')) {
      const idx = parseInt(templateId.replace('default-', ''));
      if (idx >= 0 && idx < DEFAULT_TEMPLATES.length) {
        return {
          ...DEFAULT_TEMPLATES[idx],
          id: templateId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return null;
    }

    // Get from database
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type as TemplateType,
      description: data.description || '',
      content: data.content,
      variables: data.variables as any,
      googleDocTemplateId: data.google_doc_template_id || undefined,
      googleSheetTemplateId: data.google_sheet_template_id || undefined,
      isDefault: data.is_default,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Render a template with provided data
   */
  renderTemplate(templateContent: string, data: TemplateData): string {
    let result = templateContent;

    // Simple template rendering - replace {variable} with values
    // Supports conditional rendering: {var ? 'text' : 'else'}
    result = result.replace(/\{([^}]+)\}/g, (match, expression) => {
      // Handle conditional expressions
      if (expression.includes('?')) {
        const [condition, alternatives] = expression.split('?');
        const [trueVal, falseVal] = alternatives.split(':');

        const conditionValue = data[condition.trim()];
        if (conditionValue) {
          return trueVal.trim().replace(/[`'"]/g, '');
        } else if (falseVal) {
          return falseVal.trim().replace(/[`'"]/g, '');
        }
        return '';
      }

      // Simple variable replacement
      const value = data[expression.trim()];
      return value !== undefined && value !== null ? String(value) : '';
    });

    return result;
  }

  /**
   * Create a Google Doc from a template
   */
  async createDocFromTemplate(
    templateId: string,
    data: TemplateData,
    options?: {
      title?: string;
      folderId?: string;
    }
  ): Promise<{ documentId: string; url: string }> {
    if (!this.userId) {
      throw new Error('User ID required to create documents');
    }

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Render template content
    const content = this.renderTemplate(template.content, data);
    const title = options?.title || data.title || template.name;

    // Create document
    const docs = await DocsClient.forUser(this.userId);
    const doc = await docs.createDocument(title);
    const documentId = doc.documentId!;

    // Insert content as markdown
    await docs.insertMarkdown(documentId, content);

    // Move to folder if specified
    if (options?.folderId) {
      const { DriveClient } = await import('@/lib/google/drive-client');
      const drive = await DriveClient.forUser(this.userId);
      await drive.moveFile(documentId, options.folderId);
    }

    return {
      documentId,
      url: docs.getDocumentUrl(documentId),
    };
  }

  /**
   * Create a Google Sheet from a project tracker template
   */
  async createSheetFromTemplate(
    templateId: string,
    data: TemplateData,
    options?: {
      title?: string;
      folderId?: string;
    }
  ): Promise<{ spreadsheetId: string; url: string }> {
    if (!this.userId) {
      throw new Error('User ID required to create sheets');
    }

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // If template has a Google Sheet template ID, copy it
    if (template.googleSheetTemplateId) {
      const sheets = await SheetsClient.forUser(this.userId);
      const { spreadsheetId, spreadsheetUrl } = await sheets.createFromTemplate(
        template.googleSheetTemplateId,
        options?.title || data.project_name || template.name,
        options?.folderId
      );
      return { spreadsheetId, url: spreadsheetUrl };
    }

    // Otherwise, create from JSON definition
    const sheetConfig = JSON.parse(template.content);
    const sheets = await SheetsClient.forUser(this.userId);

    const { spreadsheetId, spreadsheetUrl } = await sheets.createSpreadsheet(
      options?.title || data.project_name || template.name,
      options?.folderId
    );

    // Populate sheets
    for (const sheetDef of sheetConfig.sheets) {
      // Add sheet if not the first one (first sheet exists by default)
      if (sheetConfig.sheets.indexOf(sheetDef) > 0) {
        await sheets.addSheet(spreadsheetId, sheetDef.name);
      } else {
        // Rename the default sheet
        await sheets.batchUpdate(spreadsheetId, [
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                title: sheetDef.name,
              },
              fields: 'title',
            },
          },
        ]);
      }

      // Add headers
      await sheets.updateCells(
        spreadsheetId,
        `${sheetDef.name}!A1:${String.fromCharCode(65 + sheetDef.headers.length - 1)}1`,
        [sheetDef.headers]
      );

      // Add initial data if any
      if (sheetDef.initialData && sheetDef.initialData.length > 0) {
        const renderedData = sheetDef.initialData.map((row: any[]) =>
          row.map((cell) =>
            typeof cell === 'string' ? this.renderTemplate(cell, data) : cell
          )
        );

        await sheets.updateCells(
          spreadsheetId,
          `${sheetDef.name}!A2:${String.fromCharCode(65 + sheetDef.headers.length - 1)}${1 + renderedData.length}`,
          renderedData
        );
      }

      // Format headers (bold)
      await sheets.batchUpdate(spreadsheetId, [
        {
          repeatCell: {
            range: {
              sheetId: sheetConfig.sheets.indexOf(sheetDef),
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
      ]);
    }

    return {
      spreadsheetId,
      url: spreadsheetUrl,
    };
  }

  /**
   * Save a custom template
   */
  async saveTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.userId) {
      throw new Error('User ID required to save templates');
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: this.userId,
        name: template.name,
        type: template.type,
        description: template.description,
        content: template.content,
        variables: template.variables as any,
        google_doc_template_id: template.googleDocTemplateId,
        google_sheet_template_id: template.googleSheetTemplateId,
        is_default: template.isDefault,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Delete a custom template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID required to delete templates');
    }

    // Can't delete default templates
    if (templateId.startsWith('default-')) {
      throw new Error('Cannot delete default templates');
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }
}
