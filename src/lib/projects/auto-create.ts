import { getSupabaseServerClient } from '@/lib/db/client';
import { DriveClient } from '@/lib/google/drive-client';
import { SheetsClient } from '@/lib/google/sheets-client';
import type { Database } from '@/types/database';

type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

interface AutoCreateProjectParams {
  userId: string;
  sowId: string;
  emailId: string;
}

interface AutoCreateProjectResult {
  projectId: string;
  folderId: string | null;
  sheetId: string | null;
  tasksCreated: number;
}

/**
 * Automatically create a project from a generated SOW
 * - Creates project record
 * - Links SOW to project
 * - Creates Google Drive folder
 * - Creates Google Sheets tracker
 * - Extracts and creates initial tasks
 */
export async function autoCreateProjectFromSOW({
  userId,
  sowId,
  emailId,
}: AutoCreateProjectParams): Promise<AutoCreateProjectResult> {
  const supabase = getSupabaseServerClient();

  // Fetch the SOW
  const { data: sow, error: sowError } = await supabase
    .from('scope_of_works')
    .select('*')
    .eq('id', sowId)
    .eq('user_id', userId)
    .single();

  if (sowError || !sow) {
    throw new Error(`SOW not found: ${sowId}`);
  }

  // Fetch email to get client info
  const { data: email, error: emailError } = await supabase
    .from('email_messages')
    .select('from_email, from_name')
    .eq('id', emailId)
    .eq('user_id', userId)
    .single();

  if (emailError || !email) {
    throw new Error(`Email not found: ${emailId}`);
  }

  // Create project
  const projectData: ProjectInsert = {
    user_id: userId,
    name: sow.title,
    description: `Project created from SOW: ${sow.title}`,
    client_name: email.from_name || null,
    client_email: email.from_email || null,
    status: 'active',
    start_date: new Date().toISOString(),
  };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to create project: ${projectError?.message || 'unknown error'}`);
  }

  // Link SOW to project
  await supabase
    .from('scope_of_works')
    .update({ project_id: project.id })
    .eq('id', sowId)
    .eq('user_id', userId);

  let folderId: string | null = null;
  let sheetId: string | null = null;

  try {
    // Create Google Drive folder
    const drive = await DriveClient.forUser(userId);
    const folder = await drive.createFolder(`Project: ${project.name}`);
    folderId = folder.id!;

    // Create Google Sheets tracker in the project folder
    const sheets = await SheetsClient.forUser(userId);
    const spreadsheet = await sheets.createSpreadsheet(`${project.name} - Tracker`, folderId);
    sheetId = spreadsheet.spreadsheetId!;

    // Update project with Google IDs
    await supabase
      .from('projects')
      .update({
        google_folder_id: folderId,
        google_sheet_id: sheetId,
      })
      .eq('id', project.id)
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error creating Google resources:', error);
    // Continue even if Google resources fail - project is still created
  }

  // Extract tasks from SOW content
  const tasksCreated = await extractAndCreateTasks({
    userId,
    projectId: project.id,
    sowContent: sow.content || '',
    emailId,
  });

  // Log the auto-creation
  await supabase.from('agent_logs').insert({
    user_id: userId,
    email_id: emailId,
    agent_type: 'auto-project-creator',
    action: 'create_project_from_sow',
    input_data: {
      sow_id: sowId,
      sow_title: sow.title,
    },
    output_data: {
      project_id: project.id,
      folder_id: folderId,
      sheet_id: sheetId,
      tasks_created: tasksCreated,
    },
    success: true,
  });

  return {
    projectId: project.id,
    folderId,
    sheetId,
    tasksCreated,
  };
}

/**
 * Extract tasks from SOW content and create them
 * Simple extraction for now - looks for bulleted lists under "Deliverables" section
 */
async function extractAndCreateTasks({
  userId,
  projectId,
  sowContent,
  emailId,
}: {
  userId: string;
  projectId: string;
  sowContent: string;
  emailId: string;
}): Promise<number> {
  const supabase = getSupabaseServerClient();

  // Simple regex to find deliverables section
  const deliverablesMatch = sowContent.match(/## Deliverables\n([\s\S]*?)(?=\n##|$)/);
  if (!deliverablesMatch) {
    return 0;
  }

  const deliverablesSection = deliverablesMatch[1];
  const bulletPoints = deliverablesSection.match(/^[-*]\s+(.+)$/gm);

  if (!bulletPoints || bulletPoints.length === 0) {
    return 0;
  }

  const tasks: TaskInsert[] = bulletPoints
    .map((bullet) => {
      const text = bullet.replace(/^[-*]\s+/, '').trim();
      if (!text || text.length < 3) return null;

      return {
        user_id: userId,
        project_id: projectId,
        email_id: emailId,
        title: text,
        status: 'pending',
        priority: 'medium',
      } as TaskInsert;
    })
    .filter((t): t is TaskInsert => t !== null);

  if (tasks.length === 0) {
    return 0;
  }

  const { error } = await supabase.from('tasks').insert(tasks);

  if (error) {
    console.error('Error creating tasks from SOW:', error);
    return 0;
  }

  return tasks.length;
}
