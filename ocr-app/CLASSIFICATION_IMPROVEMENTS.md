# Email Classification System Improvements

## Current Performance Issues

Based on analysis of 516 classified emails:

- **87.8% misclassified as "general"** (should be <30%)
- **87.6% have low confidence scores** (<0.7)
- **Average confidence: 0.544** (should be >0.8)
- **100% neutral sentiment** (should vary)
- **99.8% medium priority** (should vary)
- **Pattern-matching only catches 12.2%** of emails (should be >30%)

## Root Causes

1. **Aggressive 5-second timeout** causing AI classification to fail
2. **Weak pattern matching** that doesn't catch common email types
3. **Generic AI prompt** without examples or structured output
4. **Fragile JSON extraction** using regex instead of structured output
5. **No retry logic** when classification fails

## Recommended Fixes

### Priority 1: Increase Timeout (Quick Win)

**File:** `src/lib/ai/classifier.ts:84`

```typescript
// Change from:
const TIMEOUT_MS = parseInt(process.env.CLASSIFIER_TIMEOUT_MS || '5000', 10);

// To:
const TIMEOUT_MS = parseInt(process.env.CLASSIFIER_TIMEOUT_MS || '15000', 10);
```

**Impact:** Will allow AI to complete more classifications instead of falling back to generic.

### Priority 2: Improve Pattern Matching (Quick Win)

**File:** `src/lib/ai/classifier.ts:6-11`

Add more comprehensive patterns:

```typescript
const OBVIOUS_PATTERNS = {
  // Authentication & Security
  security: /\b(verify|verification|security alert|password reset|two.?factor|2fa|suspicious activity|login attempt)\b/i,

  // Financial
  invoice: /\b(invoice|bill|payment\s+due|amount\s+(owed|due)|please\s+pay|receipt|charge)\b/i,

  // Legal & Contracts
  contract: /\b(sow|statement\s+of\s+work|nda|non-disclosure|agreement|contract|terms\s+and\s+conditions|sign\s+here)\b/i,

  // Project Management
  project_update: /\b(status\s+update|progress\s+report|milestone|sprint|standup|weekly\s+update|project\s+status|retrospective)\b/i,

  // Client Communications
  client_request: /\b(quote|proposal|can\s+you|would\s+you|project\s+inquiry|new\s+project|rfp|request\s+for\s+proposal|estimate)\b/i,

  // Marketing (should be filtered/ignored)
  marketing: /\b(unsubscribe|promotional|newsletter|special\s+offer|discount|sale|limited\s+time)\b/i,

  // Notifications (low priority)
  notification: /\b(notification|alert|reminder|confirmation|automated\s+message|do\s+not\s+reply)\b/i,
};
```

**Impact:** Should catch 40-50% of emails with patterns, reducing AI costs by 3-4x.

### Priority 3: Use Structured Output (Medium Effort)

**File:** `src/lib/ai/classifier.ts:44-114`

Replace the current Claude API call with structured output:

```typescript
async function classifyWithClaude(
  subject: string,
  body: string,
  fromEmail: string
): Promise<ClassificationResult> {
  const prompt = `Classify this email for an executive assistant AI.

Email Details:
- From: ${fromEmail}
- Subject: ${subject}
- Body: ${body.substring(0, 2000)}

Classification Categories:
- client_request: New project inquiries, RFPs, quote requests, proposals
- invoice: Bills, payment requests, receipts, financial documents
- contract: SOWs, NDAs, agreements, legal documents, terms
- project_update: Status updates, progress reports, team communications, standups
- general: General business correspondence, announcements, informational emails
- other: Personal emails, marketing, spam, or anything that doesn't fit above

Instructions:
1. Choose the MOST SPECIFIC category that applies
2. Assign priority based on urgency and business impact
3. Detect sentiment and whether action is required
4. Generate 2-4 relevant tags (lowercase, hyphenated)
5. Assign appropriate AI agents to handle the email:
   - sow-generator: For client requests that need proposals/SOWs
   - task-extractor: For emails containing action items or tasks
   - document-summarizer: For long emails or documents that need summarization

Examples:
- "Can you send me a quote for website redesign?" → client_request, high, action_required, ["quote-request", "web-design"], ["sow-generator"]
- "Invoice #12345 - Due Nov 30" → invoice, high, neutral, ["invoice", "payment-due"], []
- "Weekly Sprint Update - Week 45" → project_update, medium, neutral, ["sprint", "status-update"], ["document-summarizer"]`;

  const message = await createClaudeMessage({
    prompt,
    maxTokens: 1024,
    // Use a structured response format
    tools: [{
      name: 'classify_email',
      description: 'Classify an email with category, priority, sentiment, tags, and agents',
      input_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['client_request', 'invoice', 'contract', 'project_update', 'general', 'other']
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'medium', 'low']
          },
          sentiment: {
            type: 'string',
            enum: ['positive', 'neutral', 'negative', 'action_required']
          },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          assigned_agents: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['sow-generator', 'task-extractor', 'document-summarizer']
            }
          },
          confidence_score: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          reasoning: {
            type: 'string'
          }
        },
        required: ['category', 'priority', 'sentiment', 'tags', 'assigned_agents', 'confidence_score', 'reasoning']
      }
    }]
  });

  // Extract structured response
  const toolUse = message.content.find(c => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No structured output from Claude');
  }

  return toolUse.input as ClassificationResult;
}
```

**Impact:**
- More reliable extraction (no regex parsing)
- Better quality classifications with examples
- Type-safe responses
- Higher confidence scores

### Priority 4: Add Retry Logic (Medium Effort)

Add exponential backoff for failed classifications:

```typescript
async function classifyWithRetry(
  subject: string,
  body: string,
  fromEmail: string,
  maxRetries = 2
): Promise<ClassificationResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await classifyWithClaude(subject, body, fromEmail);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Classification failed after retries');
}
```

**Impact:** Reduce timeout failures by 50-70%.

### Priority 5: Create User-Specific Rules (Advanced)

Allow users to define custom classification rules in their preferences:

```typescript
// In user preferences JSON
{
  "classification_rules": [
    {
      "name": "Vendor Invoices",
      "conditions": {
        "from_domain": ["vendor1.com", "vendor2.com"],
        "subject_contains": ["invoice", "bill"]
      },
      "classification": {
        "category": "invoice",
        "priority": "high",
        "tags": ["vendor-invoice"],
        "assigned_agents": []
      }
    },
    {
      "name": "Client XYZ Communications",
      "conditions": {
        "from_email": "client@xyz.com"
      },
      "classification": {
        "category": "client_request",
        "priority": "urgent",
        "tags": ["client-xyz"],
        "assigned_agents": ["sow-generator", "task-extractor"]
      }
    }
  ]
}
```

**Impact:**
- Personalized to user's workflow
- Can achieve 95%+ accuracy for known senders
- Reduces AI costs dramatically

### Priority 6: Add More Categories (Optional)

Consider adding categories for:
- `marketing` - Promotional emails, newsletters (can be auto-archived)
- `security` - Password resets, 2FA, security alerts
- `notification` - Automated notifications, receipts, confirmations
- `internal` - Team communications, company announcements
- `personal` - Personal emails that got mixed in

## Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Increase timeout to 15 seconds
2. ✅ Add comprehensive pattern matching
3. ✅ Add retry logic with backoff

**Expected Impact:**
- Classification accuracy: 87.8% → 60-70% "general"
- Confidence scores: 0.544 → 0.75+
- Pattern matching: 12.2% → 40-50%

### Phase 2: Structural Improvements (4-6 hours)
1. ✅ Implement structured output with tool use
2. ✅ Add examples to prompt
3. ✅ Improve error handling

**Expected Impact:**
- Classification accuracy: 60-70% → 30-40% "general"
- Confidence scores: 0.75 → 0.85+
- Better sentiment and priority variation

### Phase 3: Advanced Features (1-2 days)
1. ✅ User-specific rules engine
2. ✅ Learning from user corrections
3. ✅ Category suggestions based on patterns
4. ✅ A/B testing different prompts

**Expected Impact:**
- Classification accuracy: 30-40% → <20% "general"
- Confidence scores: 0.85 → 0.90+
- Personalized to each user's workflow

## Testing Strategy

1. **Unit Tests:**
   - Test pattern matching for each category
   - Test JSON extraction
   - Test fallback logic

2. **Integration Tests:**
   - Test with sample emails from each category
   - Test timeout scenarios
   - Test retry logic

3. **User Feedback Loop:**
   - Track user corrections in database
   - Monthly review of misclassifications
   - Adjust patterns and prompts based on feedback

## Monitoring & Metrics

Track these KPIs:
- Classification accuracy by category
- Average confidence score
- Correction rate (should be <5%)
- Pattern matching rate (should be >40%)
- AI classification failure rate (should be <5%)
- Average classification time

## Cost Optimization

Current cost structure:
- Pattern matching: $0.00 per email (free)
- AI classification: ~$0.0015 per email (Claude API)

With improvements:
- 40-50% caught by patterns → ~$0.0008 per email (50% savings)
- User-specific rules → ~$0.0003 per email (80% savings for repeat senders)

For 10,000 emails/month:
- Current: ~$15/month (with timeouts causing fallbacks)
- With patterns: ~$8/month
- With user rules: ~$3/month
