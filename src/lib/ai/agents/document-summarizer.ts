import { getSupabaseServerClient } from '@/lib/db/client';
import { createClaudeMessage } from '@/lib/ai/anthropic-client';

interface DocumentSummary {
  summary: string;
  key_points: string[];
  document_type: string;
  word_count: number;
  attachments?: Array<{ filename: string; type: string }>;
  links?: string[];
}

/**
 * Summarize a long email or document using Claude
 */
export async function summarizeDocument(emailId: string): Promise<DocumentSummary> {
  const supabase = getSupabaseServerClient();

  // Get email content
  const emailResult: any = await supabase
    .from('email_messages')
    .select('subject, body_plain, body_html, from_email, user_id')
    .eq('id', emailId)
    .single();

  if (emailResult.error || !emailResult.data) {
    throw new Error(`Email not found: ${emailId}`);
  }

  const email: {
    subject: string | null;
    body_plain: string | null;
    body_html: string | null;
    from_email: string | null;
    user_id: string;
  } = emailResult.data;

  const body = email.body_plain || email.body_html || '';
  const wordCount = body.split(/\s+/).length;

  // Fetch OCR text and attachments for this email
  const { data: docs } = await supabase
    .from('documents')
    .select('filename, file_type, ocr_text')
    .eq('email_id', emailId);

  const ocrSnippets = (docs || [])
    .map(d => (d.ocr_text || '').toString().trim())
    .filter(Boolean)
    .map(t => (t.length > 2000 ? t.slice(0, 2000) + '…' : t));

  const attachments = (docs || []).map(d => ({ filename: d.filename as string, type: (d.file_type as string) || '' }));

  // Extract URLs from the email body to surface referenced sites
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;
  const links = Array.from(new Set((body.match(urlRegex) || []).slice(0, 20)));

  // Pull latest fetched external content (if any)
  const { data: linkLog } = await supabase
    .from('agent_logs')
    .select('output_data, created_at')
    .eq('email_id', emailId)
    .eq('user_id', email.user_id)
    .eq('agent_type', 'link-fetch')
    .eq('success', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const externalTexts: Array<{ url: string; type: string; content: string }> = (linkLog?.output_data as any)?.external_texts || [];

  // Only summarize if document is substantial (>200 words)
  if (wordCount < 200 && ocrSnippets.length === 0) {
    return {
      summary: body.substring(0, 500),
      key_points: [],
      document_type: 'short_email',
      word_count: wordCount,
      attachments,
      links,
    };
  }

  const prompt = `You are an expert at summarizing business documents and emails. Provide a clear, concise summary of this document.

From: ${email.from_email}
Subject: ${email.subject}

Primary Email Content (trimmed):
${body.substring(0, 8000)}

Extracted Attachment Text (trimmed, may be empty):
${ocrSnippets.join('\n\n---\n\n').substring(0, 8000)}

Referenced Links (from email):
${links.join('\n')}

External Web Content (trimmed, user-fetched):
${externalTexts.map(e => `URL: ${e.url}\nTYPE: ${e.type}\nCONTENT:\n${(e.content || '').slice(0, 4000)}`).join('\n\n---\n\n').slice(0, 8000)}

Provide:
1. A 2-3 sentence summary capturing the main purpose and conclusions
2. 3-5 key points (bullet points)
3. Document type (email, proposal, report, contract, etc.)

Respond in JSON format:
{
  "summary": "2-3 sentence summary here",
  "key_points": [
    "First key point",
    "Second key point",
    "Third key point"
  ],
  "document_type": "email",
  "attachments": [{ "filename": "..", "type": ".." }],
  "links": ["https://..."]
}`;

  const message = await createClaudeMessage({ prompt, maxTokens: 1024 });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const result = JSON.parse(jsonMatch[0]);

  const summary: DocumentSummary = {
    summary: result.summary,
    key_points: result.key_points,
    document_type: result.document_type,
    word_count: wordCount,
    attachments,
    links,
  };

  // Save summary to email_messages table for faster access
  await supabase
    .from('email_messages')
    .update({ ai_summary: summary as any })
    .eq('id', emailId);

  // Log the agent action
  // @ts-ignore - Supabase type inference issue
  await supabase.from('agent_logs').insert({
    user_id: email.user_id,
    email_id: emailId,
    agent_type: 'document-summarizer',
    action: 'summarize_document',
    input_data: {
      subject: email.subject,
      word_count: wordCount,
    },
    output_data: summary,
    success: true,
  });

  return summary;
}
