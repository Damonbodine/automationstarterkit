import { getSupabaseServerClient } from '@/lib/db/client';
import { createClaudeMessage } from '@/lib/ai/anthropic-client';
import type Anthropic from '@anthropic-ai/sdk';

// Pattern-based pre-classification (free tier)
// Improved patterns to catch 40-50% of emails and reduce AI costs
const OBVIOUS_PATTERNS = {
  // Financial documents
  invoice: /\b(invoice|bill|payment\s+due|amount\s+(owed|due)|please\s+pay|receipt|charge|statement|remittance)\b/i,

  // Legal & contracts
  contract: /\b(sow|statement\s+of\s+work|nda|non-disclosure|agreement|contract|terms\s+and\s+conditions|sign\s+here|e-sign|docusign)\b/i,

  // Project management & updates
  project_update: /\b(status\s+update|progress\s+report|milestone|sprint|standup|weekly\s+update|project\s+status|retrospective|scrum|daily\s+update)\b/i,

  // Client requests & RFPs
  client_request: /\b(quote|proposal|can\s+you|would\s+you|project\s+inquiry|new\s+project|rfp|request\s+for\s+proposal|estimate|consultation|interested\s+in\s+working)\b/i,
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
  const prompt = `You are an expert email classifier for an executive assistant AI. Analyze this email and classify it accurately.

FROM: ${fromEmail}
SUBJECT: ${subject}
BODY: ${body.substring(0, 2000)}

=== CLASSIFICATION CATEGORIES ===
Choose the MOST SPECIFIC category that applies:

- client_request: New project inquiries, RFPs, quote requests, proposals, client questions about services
- invoice: Bills, payment requests, receipts, financial statements, charges
- contract: SOWs, NDAs, agreements, legal documents, terms & conditions, signing requests
- project_update: Status updates, progress reports, team communications, standups, sprint reviews
- general: General business correspondence, announcements, newsletters, informational emails
- other: Personal emails, marketing spam, automated notifications that don't fit business categories

=== PRIORITY LEVELS ===
- urgent: Requires immediate action (deadlines today, emergencies, critical issues)
- high: Important and time-sensitive (deadlines this week, key decisions needed)
- medium: Important but not urgent (routine work, FYI items, standard communications)
- low: Low importance (newsletters, FYI, optional reading)

=== SENTIMENT ===
- positive: Friendly, appreciative, congratulatory tone
- neutral: Professional, informational, matter-of-fact
- negative: Complaints, frustration, problems reported
- action_required: Explicitly requesting action, decisions, or responses (regardless of tone)

=== AGENT ASSIGNMENTS ===
Assign appropriate AI agents (can be empty array):
- sow-generator: For client requests needing proposals/SOWs
- task-extractor: For emails containing actionable tasks or TODO items
- document-summarizer: For long emails/documents needing summarization (>500 words)

=== EXAMPLES ===
Email: "Can you send me a quote for website redesign? Budget is $50k. Need by Friday."
→ category: client_request, priority: high, sentiment: action_required, agents: ["sow-generator", "task-extractor"], tags: ["quote-request", "web-design", "deadline"]

Email: "Invoice #12345 - Amount Due: $2,500 - Due Date: Nov 30"
→ category: invoice, priority: high, sentiment: neutral, agents: [], tags: ["invoice", "payment-due", "financial"]

Email: "Weekly Sprint Update: Completed 23 story points, 3 bugs fixed"
→ category: project_update, priority: medium, sentiment: positive, agents: ["document-summarizer"], tags: ["sprint", "status-update", "completed"]

Email: "URGENT: Production server down, customers can't access site"
→ category: other, priority: urgent, sentiment: negative, agents: ["task-extractor"], tags: ["emergency", "outage", "critical"]

Now classify the email above. Respond ONLY with valid JSON (no markdown):
{
  "category": "...",
  "priority": "...",
  "sentiment": "...",
  "tags": ["tag1", "tag2"],
  "assigned_agents": ["agent1"],
  "confidence_score": 0.95,
  "reasoning": "Brief explanation"
}`;

  // Enforce a hard timeout for model latency adherence (15s default, increased from 5s to reduce timeouts)
  const TIMEOUT_MS = parseInt(process.env.CLASSIFIER_TIMEOUT_MS || '15000', 10);

  const classifyPromise = createClaudeMessage({ prompt, maxTokens: 1024 });

  const message = (await Promise.race([
    classifyPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Classification timeout')), TIMEOUT_MS)),
  ])) as Anthropic.Message;

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
    // Fall back to AI classification, with graceful degradation
    try {
      result = await classifyWithClaude(subject, body, fromEmail);
    } catch (err) {
      // On failure/timeout, assign general + task-extractor, medium priority
      result = {
        category: 'general',
        priority: 'medium',
        sentiment: 'neutral',
        tags: [],
        assigned_agents: ['task-extractor'],
        confidence_score: 0.5,
      };
    }
  }

  // Save classification to database
  // @ts-ignore - Supabase type inference issue
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
  // @ts-ignore - Supabase type inference issue
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
    // @ts-ignore - Supabase type inference issue
    .update({
      category: correctCategory,
      user_feedback: userFeedback,
      confidence_score: 1.0,
    })
    .eq('email_id', emailId);
}
