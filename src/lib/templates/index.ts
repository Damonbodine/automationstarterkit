/**
 * Template system for Google Workspace document generation
 *
 * Usage:
 * ```typescript
 * const tm = new TemplateManager(userId);
 *
 * // List available templates
 * const templates = await tm.getTemplates('sow');
 *
 * // Create a document from template
 * const { documentId, url } = await tm.createDocFromTemplate(
 *   'default-0',
 *   {
 *     title: 'Website Development SOW',
 *     client_name: 'Acme Corp',
 *     project_overview: 'Build a responsive website...',
 *     // ... other variables
 *   },
 *   { folderId: 'google-drive-folder-id' }
 * );
 *
 * // Create a project tracker sheet
 * const { spreadsheetId, url } = await tm.createSheetFromTemplate(
 *   'default-2',
 *   {
 *     project_name: 'Acme Website',
 *     client_name: 'Acme Corp',
 *     start_date: '2025-01-01',
 *   }
 * );
 * ```
 */

export * from './template-types';
export * from './default-templates';
export * from './template-manager';
