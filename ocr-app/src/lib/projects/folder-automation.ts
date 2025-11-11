import { DriveClient } from '@/lib/google/drive-client';
import { SheetsClient } from '@/lib/google/sheets-client';
import { TemplateManager } from '@/lib/templates';
import { getSupabaseServerClient } from '@/lib/db/client';

/**
 * Project folder structure configuration
 */
export interface ProjectFolderStructure {
  mainFolder: string;
  subfolders: string[];
}

/**
 * Default project folder structure
 */
export const DEFAULT_PROJECT_FOLDERS: ProjectFolderStructure = {
  mainFolder: 'Project: {project_name}',
  subfolders: [
    'Documents',
    'Spreadsheets',
    'Presentations',
    'Assets',
    'Deliverables',
    'Contracts',
  ],
};

/**
 * Result of project folder creation
 */
export interface ProjectFolderResult {
  mainFolderId: string;
  mainFolderUrl: string;
  subfolders: Array<{
    name: string;
    folderId: string;
    folderUrl: string;
  }>;
  trackerSheetId?: string;
  trackerSheetUrl?: string;
}

/**
 * Create complete project folder structure in Google Drive
 */
export async function createProjectFolders(
  projectId: string,
  userId: string,
  options?: {
    structure?: ProjectFolderStructure;
    createTracker?: boolean;
    parentFolderId?: string;
  }
): Promise<ProjectFolderResult> {
  const supabase = getSupabaseServerClient();

  // Get project details
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const drive = await DriveClient.forUser(userId);
  const structure = options?.structure || DEFAULT_PROJECT_FOLDERS;

  // Create main project folder
  const mainFolderName = structure.mainFolder.replace(
    '{project_name}',
    project.name || 'Untitled Project'
  );

  const mainFolder = await drive.createFolder(
    mainFolderName,
    options?.parentFolderId
  );

  if (!mainFolder.id) {
    throw new Error('Failed to create main project folder');
  }

  // Create subfolders
  const subfolders = [];
  for (const folderName of structure.subfolders) {
    const subfolder = await drive.createFolder(folderName, mainFolder.id);
    subfolders.push({
      name: folderName,
      folderId: subfolder.id!,
      folderUrl: subfolder.webViewLink!,
    });
  }

  const result: ProjectFolderResult = {
    mainFolderId: mainFolder.id,
    mainFolderUrl: mainFolder.webViewLink!,
    subfolders,
  };

  // Create project tracker sheet if requested
  if (options?.createTracker !== false) {
    try {
      const templateManager = new TemplateManager(userId);

      // Find the project tracker template
      const templates = await templateManager.getTemplates('project_tracker');
      const trackerTemplate = templates.find((t) => t.isDefault);

      if (trackerTemplate) {
        const { spreadsheetId, url } =
          await templateManager.createSheetFromTemplate(
            trackerTemplate.id,
            {
              project_name: project.name || 'Untitled Project',
              client_name: project.client_name || 'Client',
              start_date: project.start_date || new Date().toISOString(),
              end_date: project.end_date || '',
              budget: project.budget || '',
              status: project.status || 'active',
            },
            {
              title: `${project.name} - Tracker`,
              folderId: subfolders.find((f) => f.name === 'Spreadsheets')
                ?.folderId,
            }
          );

        result.trackerSheetId = spreadsheetId;
        result.trackerSheetUrl = url;
      }
    } catch (err) {
      console.error('Failed to create project tracker:', err);
      // Don't fail the entire operation if tracker creation fails
    }
  }

  // Update project with folder information
  await supabase
    .from('projects')
    .update({
      google_folder_id: mainFolder.id,
      google_sheet_id: result.trackerSheetId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  return result;
}

/**
 * Auto-create project from SOW
 */
export async function autoCreateProjectFromSOW(
  sowId: string,
  userId: string
): Promise<string> {
  const supabase = getSupabaseServerClient();

  // Get SOW details
  const { data: sow, error: sowError } = await supabase
    .from('scope_of_works')
    .select('*, email_messages(*)')
    .eq('id', sowId)
    .single();

  if (sowError || !sow) {
    throw new Error(`SOW not found: ${sowId}`);
  }

  // Extract project details from SOW
  const projectData = {
    user_id: userId,
    name: sow.title || 'Untitled Project',
    client_name:
      (sow.email_messages as any)?.from_name ||
      (sow.email_messages as any)?.from_email ||
      'Client',
    status: 'active' as 'active' | 'paused' | 'completed' | 'archived',
    start_date: new Date().toISOString(),
    metadata: {
      source_email_id: sow.email_id,
      source_sow_id: sowId,
    },
  };

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    // @ts-ignore - Supabase type inference issue with metadata field
    .insert(projectData)
    .select('id')
    .single();

  if (projectError || !project) {
    throw new Error(
      `Failed to create project: ${projectError?.message || 'unknown'}`
    );
  }

  // Link SOW to project
  await supabase
    .from('scope_of_works')
    .update({ project_id: project.id })
    .eq('id', sowId);

  // Create folder structure
  try {
    const folderResult = await createProjectFolders(project.id, userId);

    // Move SOW document to project folder if it has a Google Doc ID
    if (sow.google_doc_id && folderResult.mainFolderId) {
      const drive = await DriveClient.forUser(userId);
      const documentsFolder = folderResult.subfolders.find(
        (f) => f.name === 'Documents'
      );
      if (documentsFolder) {
        await drive.moveFile(sow.google_doc_id, documentsFolder.folderId);
      }
    }
  } catch (err) {
    console.error('Failed to create project folders:', err);
    // Don't fail project creation if folder creation fails
  }

  return project.id;
}

/**
 * Link email to project and move attachments to project folder
 * Note: Requires project_id field to be added to email_messages table
 */
export async function linkEmailToProject(
  emailId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseServerClient();

  // TODO: Add project_id field to email_messages table
  // await supabase
  //   .from('email_messages')
  //   .update({ project_id: projectId })
  //   .eq('id', emailId);

  // Get project folder
  const { data: project } = await supabase
    .from('projects')
    .select('google_folder_id')
    .eq('id', projectId)
    .single();

  if (!project?.google_folder_id) {
    return; // No folder to move to
  }

  // Get email attachments/documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('email_id', emailId);

  if (!documents || documents.length === 0) {
    return;
  }

  // TODO: Add google_drive_id field to documents table to enable this functionality
  // const drive = await DriveClient.forUser(userId);

  // // Move documents to project Assets folder
  // for (const doc of documents) {
  //   if (doc.google_drive_id) {
  //     try {
  //       // Find Assets subfolder
  //       const folders = await drive.listFiles(project.google_folder_id);
  //       const assetsFolder = folders.find((f) => f.name === 'Assets');

  //       if (assetsFolder?.id) {
  //         await drive.moveFile(doc.google_drive_id, assetsFolder.id);
  //       }
  //     } catch (err) {
  //       console.error(`Failed to move document ${doc.id}:`, err);
  //     }
  //   }
  // }
}

/**
 * Update project tracker sheet with new information
 */
export async function updateProjectTracker(
  projectId: string,
  userId: string,
  update: {
    milestone?: string;
    status?: string;
    progress?: number;
    notes?: string;
  }
): Promise<void> {
  const supabase = getSupabaseServerClient();

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('google_sheet_id')
    .eq('id', projectId)
    .single();

  if (!project?.google_sheet_id) {
    throw new Error('Project does not have a tracker sheet');
  }

  const sheets = await SheetsClient.forUser(userId);

  // Append new row to Updates sheet
  await sheets.appendRow(project.google_sheet_id, 'Updates', [
    new Date().toISOString(),
    update.milestone || '',
    update.status || '',
    update.progress || 0,
    update.notes || '',
    'System', // Updated by
  ]);
}
