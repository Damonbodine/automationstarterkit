import { getSupabaseServerClient } from '@/lib/db/client';
import { DocsClient } from '@/lib/google/docs-client';
import { autoCreateProjectFromSOW } from '@/lib/projects/auto-create';

interface GenerateSOWParams {
  emailId: string;
  userId: string;
  metadata?: Record<string, any>;
}

/**
 * Generate a basic Statement of Work (SOW) as a Google Doc and persist
 * a record in scope_of_works. Returns identifiers and URL.
 */
export async function generateSOW({ emailId, userId, metadata }: GenerateSOWParams): Promise<{
  sowId: string;
  googleDocId: string;
  url: string;
  title: string;
}> {
  const supabase = getSupabaseServerClient();

  // Fetch minimal email context for templating
  type EmailRow = {
    id: string;
    subject: string | null;
    from_email: string | null;
    from_name: string | null;
    body_plain: string | null;
  };

  const { data: email, error: emailErr } = (await supabase
    .from('email_messages')
    .select('id, subject, from_email, from_name, body_plain')
    .eq('id', emailId)
    .single()) as { data: EmailRow | null; error: any };

  if (emailErr || !email) {
    throw new Error(`Email not found: ${emailId}`);
  }

  const title = metadata?.title || email.subject || 'Statement of Work';
  const clientLine = email.from_name || email.from_email || 'Client';
  const notes = (metadata?.notes as string | undefined) || '';

  // Create Google Doc
  const docs = await DocsClient.forUser(userId);
  const doc = await docs.createDocument(title);
  const googleDocId = doc.documentId!;

  // Very simple SOW template; can be expanded later
  const markdown = `# ${title}\n\n` +
    `Client: ${clientLine}\n\n` +
    `## Overview\n` +
    `${notes || 'This Statement of Work outlines the scope, deliverables, timeline, and assumptions for the engagement.'}\n\n` +
    `## Scope\n` +
    `- Describe the services to be provided.\n` +
    `- List inclusions and exclusions.\n\n` +
    `## Deliverables\n` +
    `- List the concrete outputs.\n\n` +
    `## Timeline\n` +
    `- Provide key dates and milestones.\n\n` +
    `## Assumptions\n` +
    `- Note any assumptions/dependencies.\n\n` +
    `## Acceptance Criteria\n` +
    `- Define how completion will be verified.\n`;

  await docs.insertMarkdown(googleDocId, markdown);
  const url = docs.getDocumentUrl(googleDocId);

  // Persist scope_of_works row
  const { data: sow, error: sowErr } = await supabase
    .from('scope_of_works')
    // @ts-ignore - Supabase type inference issue
    .insert({
      user_id: userId,
      email_id: emailId,
      title,
      content: markdown,
      google_doc_id: googleDocId,
      status: 'draft',
    })
    .select('id')
    .single();

  if (sowErr || !sow) {
    throw new Error(`Failed to persist SOW: ${sowErr?.message || 'unknown error'}`);
  }

  // Log agent action
  // @ts-ignore - Supabase type inference issue
  await supabase.from('agent_logs').insert({
    user_id: userId,
    email_id: emailId,
    agent_type: 'sow-generator',
    action: 'generate_sow',
    input_data: {
      title,
      from: clientLine,
    },
    output_data: {
      // @ts-ignore - Supabase type inference issue
      sow_id: sow.id,
      google_doc_id: googleDocId,
      url,
    },
    success: true,
  });

  // Auto-create project from SOW
  try {
    // @ts-ignore - Supabase type inference issue
    await autoCreateProjectFromSOW({
      userId,
      // @ts-ignore - Supabase type inference issue
      sowId: sow.id,
      emailId,
    });
  } catch (error) {
    console.error('Error auto-creating project from SOW:', error);
    // Don't fail the SOW generation if project creation fails
  }

  // @ts-ignore - Supabase type inference issue
  return { sowId: sow.id, googleDocId, url, title };
}

