import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServerClient } from '@/lib/db/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DocumentSummary {
  summary: string;
  key_points: string[];
  document_type: string;
  word_count: number;
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

  // Only summarize if document is substantial (>200 words)
  if (wordCount < 200) {
    return {
      summary: body.substring(0, 500),
      key_points: [],
      document_type: 'short_email',
      word_count: wordCount,
    };
  }

  const prompt = `You are an expert at summarizing business documents and emails. Provide a clear, concise summary of this document.

From: ${email.from_email}
Subject: ${email.subject}

Content:
${body.substring(0, 8000)}

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
  "document_type": "email"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

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
  };

  // Log the agent action
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
