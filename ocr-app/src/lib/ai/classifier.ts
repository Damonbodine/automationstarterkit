import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServerClient } from '@/lib/db/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Pattern-based pre-classification (free tier)
const OBVIOUS_PATTERNS = {
  invoice: /\b(invoice|bill|payment\s+due|amount\s+owed|please\s+pay)\b/i,
  contract: /\b(sow|statement\s+of\s+work|nda|non-disclosure|agreement|contract|terms\s+and\s+conditions)\b/i,
  project_update: /\b(status\s+update|progress\s+report|milestone|sprint|standup|weekly\s+update)\b/i,
  client_request: /\b(quote|proposal|can\s+you|would\s+you|project\s+inquiry|new\s+project)\b/i,
};

type EmailCategory = 'client_request' | 'invoice' | 'contract' | 'project_update' | 'general' | 'other';
type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
type SentimentType = 'positive' | 'neutral' | 'negative' | 'action_required';

interface ClassificationResult {
  category: EmailCategory;
  priority: PriorityLevel;
  sentiment: SentimentType;
  tags: string[];
  assigned_agents: string[];
  confidence_score: number;
}

/**
 * Pre-classify email using pattern matching
 * Returns null if no obvious pattern matches
 */
function preClassify(subject: string, body: string): EmailCategory | null {
  const text = `${subject} ${body}`.toLowerCase();

  for (const [category, pattern] of Object.entries(OBVIOUS_PATTERNS)) {
    if (pattern.test(text)) {
      return category as EmailCategory;
    }
  }

  return null;
}

/**
 * Classify email using Claude AI
 */
async function classifyWithClaude(
  subject: string,
  body: string,
  fromEmail: string
): Promise<ClassificationResult> {
  const prompt = `You are an expert email classifier for an executive assistant AI. Analyze this email and classify it.

From: ${fromEmail}
Subject: ${subject}

Body:
${body.substring(0, 2000)}

Classify this email into ONE of these categories:
- client_request: New project inquiries, quote requests, or client needs
- invoice: Bills, payment requests, or financial documents
- contract: SOWs, NDAs, agreements, or legal documents
- project_update: Status updates, progress reports, or team communications
- general: General correspondence, newsletters, or informational emails
- other: Anything that doesn't fit above categories

Also determine:
1. Priority: urgent, high, medium, or low
2. Sentiment: positive, neutral, negative, or action_required
3. Tags: 2-5 relevant keywords (lowercase, hyphenated)
4. Assigned agents: Which AI agents should handle this (sow-generator, task-extractor, document-summarizer)

Respond in JSON format:
{
  "category": "...",
  "priority": "...",
  "sentiment": "...",
  "tags": ["tag1", "tag2"],
  "assigned_agents": ["agent1"],
  "confidence_score": 0.95,
  "reasoning": "Brief explanation"
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

  return {
    category: result.category,
    priority: result.priority,
    sentiment: result.sentiment,
    tags: result.tags,
    assigned_agents: result.assigned_agents,
    confidence_score: result.confidence_score,
  };
}

/**
 * Main classification function with caching
 */
export async function classifyEmail(emailId: string): Promise<ClassificationResult> {
  const supabase = getSupabaseServerClient();

  // Get email from database
  const emailResult: any = await supabase
    .from('email_messages')
    .select('subject, body_plain, from_email, user_id')
    .eq('id', emailId)
    .single();

  if (emailResult.error || !emailResult.data) {
    throw new Error(`Email not found: ${emailId}`);
  }

  const email: {
    subject: string | null;
    body_plain: string | null;
    from_email: string | null;
    user_id: string;
  } = emailResult.data;

  const subject = email.subject || '';
  const body = email.body_plain || '';
  const fromEmail = email.from_email || '';

  // Try pattern-based classification first
  const preClassified = preClassify(subject, body);

  let result: ClassificationResult;

  if (preClassified) {
    // Use pattern-based result with high confidence
    result = {
      category: preClassified,
      priority: 'medium',
      sentiment: 'neutral',
      tags: [preClassified.replace('_', '-')],
      assigned_agents: [],
      confidence_score: 0.85,
    };
  } else {
    // Fall back to AI classification
    result = await classifyWithClaude(subject, body, fromEmail);
  }

  // Save classification to database
  await supabase.from('email_classifications').upsert({
    email_id: emailId,
    category: result.category,
    priority: result.priority,
    sentiment: result.sentiment,
    tags: result.tags,
    assigned_agents: result.assigned_agents,
    confidence_score: result.confidence_score,
    classified_at: new Date().toISOString(),
  });

  // Log the classification
  await supabase.from('agent_logs').insert({
    user_id: email.user_id,
    email_id: emailId,
    agent_type: 'classifier',
    action: 'classify_email',
    input_data: { subject, from: fromEmail },
    output_data: result,
    success: true,
  });

  return result;
}

/**
 * Reclassify email with user feedback
 */
export async function reclassifyWithFeedback(
  emailId: string,
  correctCategory: EmailCategory,
  userFeedback: string
): Promise<void> {
  const supabase = getSupabaseServerClient();

  await supabase
    .from('email_classifications')
    .update({
      category: correctCategory,
      user_feedback: userFeedback,
      confidence_score: 1.0,
    })
    .eq('email_id', emailId);
}
