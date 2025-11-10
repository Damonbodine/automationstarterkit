# Phase 4: Email Agents Framework (Weeks 4-5)

**Timeline:** Weeks 4-5
**Priority:** P0 (Must Have)

---

## Overview

Build the agent framework and implement core agents that automatically process emails to perform tasks like generating SOWs, tracking projects, extracting tasks, and more.

---

## 4.1 Agent Architecture

**Priority:** P0 (Must Have)

### Base Agent Interface

```typescript
// types/agent.ts
export interface Agent {
  name: string;
  description: string;
  version: string;
  priority: number; // Higher priority agents run first

  // Determine if this agent should handle the email
  canHandle(email: Email, classification: Classification): Promise<boolean>;

  // Execute the agent's logic
  execute(
    email: Email,
    context: AgentContext
  ): Promise<AgentResult>;

  // Optional: Validate result before saving
  validate?(result: AgentResult): Promise<boolean>;
}

export interface AgentContext {
  userId: string;
  userPreferences: UserPreferences;
  projects: Project[];
  recentEmails: Email[];
  tasks: Task[];
  // Access to all user data
}

export interface AgentResult {
  success: boolean;
  action: string; // Description of what was done
  data: Record<string, any>; // Agent-specific data
  requiresApproval: boolean;
  error?: string;
}
```

### Agent Registry

```typescript
// lib/agents/registry.ts
import { Agent } from '@/types/agent';
import { SOWGeneratorAgent } from './sow-generator';
import { ProjectTrackerAgent } from './project-tracker';
import { TaskExtractorAgent } from './task-extractor';
// ... other agents

class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.register(new SOWGeneratorAgent());
    this.register(new ProjectTrackerAgent());
    this.register(new TaskExtractorAgent());
    // ... register other agents
  }

  register(agent: Agent) {
    this.agents.set(agent.name, agent);
  }

  get(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  async getApplicableAgents(
    email: Email,
    classification: Classification
  ): Promise<Agent[]> {
    const applicable: Agent[] = [];

    for (const agent of this.agents.values()) {
      if (await agent.canHandle(email, classification)) {
        applicable.push(agent);
      }
    }

    // Sort by priority
    return applicable.sort((a, b) => b.priority - a.priority);
  }
}

export const agentRegistry = new AgentRegistry();
```

### Agent Orchestrator

```typescript
// lib/agents/orchestrator.ts
import { agentRegistry } from './registry';

export async function orchestrateAgents(
  email: Email,
  classification: Classification,
  userId: string
) {
  // Get applicable agents
  const agents = await agentRegistry.getApplicableAgents(email, classification);

  if (agents.length === 0) {
    console.log('No agents applicable for email:', email.id);
    return;
  }

  // Build context
  const context = await buildAgentContext(userId);

  // Execute agents in parallel (where possible)
  const results = await Promise.allSettled(
    agents.map(agent => executeAgentSafely(agent, email, context))
  );

  // Save results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const agent = agents[i];

    if (result.status === 'fulfilled') {
      await saveAgentLog({
        user_id: userId,
        email_id: email.id,
        agent_type: agent.name,
        action: result.value.action,
        input_data: { emailId: email.id },
        output_data: result.value.data,
        success: result.value.success,
        error_message: result.value.error,
        execution_time_ms: result.value.executionTime
      });

      // Notify user
      if (result.value.requiresApproval) {
        await notifyUserForApproval(userId, email.id, agent.name, result.value);
      }
    } else {
      // Log failure
      await saveAgentLog({
        user_id: userId,
        email_id: email.id,
        agent_type: agent.name,
        action: 'execute',
        success: false,
        error_message: result.reason.message,
        execution_time_ms: 0
      });
    }
  }
}

async function executeAgentSafely(
  agent: Agent,
  email: Email,
  context: AgentContext
): Promise<AgentResult & { executionTime: number }> {
  const startTime = Date.now();

  try {
    const result = await agent.execute(email, context);
    const executionTime = Date.now() - startTime;

    return { ...result, executionTime };
  } catch (error) {
    return {
      success: false,
      action: 'execute',
      data: {},
      requiresApproval: false,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}
```

### Queue Worker

```typescript
// lib/queue/agent-worker.ts
import { Worker } from 'bullmq';
import { orchestrateAgents } from '@/lib/agents/orchestrator';

const agentWorker = new Worker('agents', async (job) => {
  const { emailId, userId, classification } = job.data;

  const email = await getEmail(emailId);

  await orchestrateAgents(email, classification, userId);
}, {
  connection: redisConnection,
  concurrency: 3 // Run 3 agent orchestrations concurrently
});
```

### Acceptance Criteria

- [ ] Agent registry with all available agents
- [ ] New agents can be added without core changes
- [ ] All agent actions logged to `agent_logs`
- [ ] Users can enable/disable agents
- [ ] Agents can be triggered manually from UI

---

## 4.2 Core Agents

### Agent 1: SOW Generator Agent

**Priority:** P0 (Must Have)

**Trigger:** Email classified as `client_request` with project scope

```typescript
// lib/agents/sow-generator.ts
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

export class SOWGeneratorAgent implements Agent {
  name = 'sow_generator';
  description = 'Generates Scope of Work documents from client requests';
  version = '1.0.0';
  priority = 90;

  async canHandle(email: Email, classification: Classification): Promise<boolean> {
    return classification.category === 'client_request' &&
           (email.body_plain.length > 200 || email.has_attachments);
  }

  async execute(email: Email, context: AgentContext): Promise<AgentResult> {
    try {
      // 1. Extract requirements
      const requirements = await this.extractRequirements(email, context);

      // 2. Generate SOW content
      const sowContent = await this.generateSOW(requirements, context);

      // 3. Create Google Doc
      const docId = await this.createGoogleDoc(
        sowContent,
        context.userId,
        `SOW - ${email.from_name} - ${new Date().toISOString().split('T')[0]}`
      );

      // 4. Save to database
      const sow = await createScopeOfWork({
        user_id: context.userId,
        email_id: email.id,
        title: `SOW for ${email.from_name}`,
        content: sowContent,
        google_doc_id: docId,
        status: 'draft'
      });

      return {
        success: true,
        action: 'Generated SOW draft',
        data: {
          sow_id: sow.id,
          doc_id: docId,
          doc_url: `https://docs.google.com/document/d/${docId}`
        },
        requiresApproval: true
      };
    } catch (error) {
      return {
        success: false,
        action: 'Generate SOW',
        data: {},
        requiresApproval: false,
        error: error.message
      };
    }
  }

  private async extractRequirements(email: Email, context: AgentContext) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Extract project requirements from this client email:

From: ${email.from_name} <${email.from_email}>
Subject: ${email.subject}
Body:
${email.body_plain}

${email.attachments?.length > 0 ? `
Attachments:
${email.attachments.map(a => `- ${a.filename}${a.ocr_text ? ': ' + a.ocr_text.substring(0, 500) : ''}`).join('\n')}
` : ''}

Extract the following in JSON format:
{
  "project_name": "...",
  "client_name": "...",
  "objectives": ["objective 1", "objective 2"],
  "deliverables": ["deliverable 1", "deliverable 2"],
  "timeline": "...",
  "budget": "...",
  "requirements": ["requirement 1", "requirement 2"],
  "constraints": ["constraint 1", "constraint 2"]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  private async generateSOW(requirements: any, context: AgentContext): Promise<string> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Get SOW template
    const template = await getSOWTemplate(context.userId);

    const prompt = `Generate a professional Scope of Work document based on these requirements:

${JSON.stringify(requirements, null, 2)}

Use this template structure:
${template}

User's company info:
${JSON.stringify(context.userPreferences.companyInfo)}

Generate a complete, professional SOW in Markdown format. Include:
- Executive Summary
- Project Objectives
- Scope of Work
- Deliverables
- Timeline & Milestones
- Budget & Payment Terms
- Assumptions & Constraints
- Acceptance Criteria`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    return message.content[0].text;
  }

  private async createGoogleDoc(
    content: string,
    userId: string,
    title: string
  ): Promise<string> {
    const user = await getUser(userId);
    const auth = getGoogleAuth(user);
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create document
    const doc = await docs.documents.create({
      requestBody: { title }
    });

    const docId = doc.data.documentId!;

    // Convert markdown to Google Docs format and insert
    await insertMarkdownContent(docs, docId, content);

    return docId;
  }
}
```

---

### Agent 2: Task Extractor Agent

**Priority:** P0 (Must Have)

**Trigger:** All emails (runs on everything)

```typescript
// lib/agents/task-extractor.ts
export class TaskExtractorAgent implements Agent {
  name = 'task_extractor';
  description = 'Extracts action items and tasks from emails';
  version = '1.0.0';
  priority = 50; // Lower priority, runs after other agents

  async canHandle(email: Email, classification: Classification): Promise<boolean> {
    // Run on all emails
    return true;
  }

  async execute(email: Email, context: AgentContext): Promise<AgentResult> {
    const tasks = await this.extractTasks(email, context);

    if (tasks.length === 0) {
      return {
        success: true,
        action: 'No tasks found',
        data: { tasks: [] },
        requiresApproval: false
      };
    }

    // Create tasks in database
    const createdTasks = [];
    for (const task of tasks) {
      const created = await createTask({
        user_id: context.userId,
        email_id: email.id,
        description: task.description,
        priority: task.priority,
        due_date: task.dueDate,
        status: 'pending'
      });
      createdTasks.push(created);
    }

    return {
      success: true,
      action: `Extracted ${tasks.length} task(s)`,
      data: { tasks: createdTasks },
      requiresApproval: false // Auto-create tasks
    };
  }

  private async extractTasks(email: Email, context: AgentContext) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Extract action items and tasks from this email:

From: ${email.from_name}
Subject: ${email.subject}
Body:
${email.body_plain}

Today's date: ${new Date().toISOString().split('T')[0]}

Extract tasks in JSON format:
{
  "tasks": [
    {
      "description": "Clear, actionable task description",
      "priority": "urgent|high|medium|low",
      "dueDate": "YYYY-MM-DD or null if not specified"
    }
  ]
}

Look for:
- Explicit action items ("Please...", "Can you...", "Need to...")
- Deadlines and due dates
- Requests and questions requiring response
- Meeting scheduling needs

If no tasks found, return empty array.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.tasks || [];
  }
}
```

---

### Agent 3: Document Summarizer Agent

**Priority:** P0 (Must Have)

**Trigger:** Email with long body (>1000 words) or PDF attachment

```typescript
// lib/agents/document-summarizer.ts
export class DocumentSummarizerAgent implements Agent {
  name = 'document_summarizer';
  description = 'Summarizes long emails and PDF documents';
  version = '1.0.0';
  priority = 80;

  async canHandle(email: Email, classification: Classification): Promise<boolean> {
    const wordCount = email.body_plain.split(/\s+/).length;
    return wordCount > 1000 || email.has_attachments;
  }

  async execute(email: Email, context: AgentContext): Promise<AgentResult> {
    let fullText = email.body_plain;

    // Include OCR text from PDFs
    if (email.attachments) {
      for (const attachment of email.attachments) {
        if (attachment.ocr_text) {
          fullText += '\n\n--- ' + attachment.filename + ' ---\n' + attachment.ocr_text;
        }
      }
    }

    const summary = await this.generateSummary(fullText);

    // Save summary with email
    await updateEmail(email.id, {
      summary: summary.summary,
      action_items: summary.actionItems
    });

    return {
      success: true,
      action: 'Generated summary',
      data: { summary: summary.summary, actionItems: summary.actionItems },
      requiresApproval: false
    };
  }

  private async generateSummary(text: string) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Summarize this email/document concisely:

${text.substring(0, 10000)} // Limit to avoid token limits

Provide:
1. A 2-3 sentence summary of the main points
2. Key action items (if any)
3. Important dates or deadlines mentioned

Format as JSON:
{
  "summary": "...",
  "actionItems": ["item 1", "item 2"],
  "importantDates": ["date 1", "date 2"]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: '', actionItems: [] };
  }
}
```

---

### Agent 4: Project Tracker Agent

**Priority:** P1 (Should Have)

**Trigger:** Email classified as `project_update`

*Implementation similar to above agents - extracts project info and updates Google Sheets*

---

### Agent 5: Response Drafter Agent

**Priority:** P1 (Should Have)

**Trigger:** Email with `action_required` sentiment

*Implementation uses Claude to draft contextual responses*

---

### Agent 6: Invoice Processor Agent

**Priority:** P2 (Nice to Have)

**Trigger:** Email classified as `invoice`

*Extracts invoice data and updates tracking sheet*

---

### Agent 7: Calendar Agent

**Priority:** P2 (Nice to Have)

**Trigger:** Email mentions meeting, schedule, availability

*Checks calendar and proposes times or creates events*

---

## 4.3 Agent Execution Pipeline

**Priority:** P0 (Must Have)

### Flow

```
New Email → Classify → Route to Agents → Execute in Parallel →
→ Log Results → Notify User → User Approves/Rejects
```

### Queue Implementation

```typescript
// After classification
await agentQueue.add('process-agents', {
  emailId: email.id,
  userId: user.id,
  classification: classification
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

### User Notifications

```typescript
async function notifyUserForApproval(
  userId: string,
  emailId: string,
  agentName: string,
  result: AgentResult
) {
  // In-app notification
  await createNotification({
    user_id: userId,
    type: 'agent_action',
    title: `${agentName} completed`,
    message: result.action,
    data: result.data,
    read: false
  });

  // Real-time WebSocket update
  await sendWebSocketMessage(userId, {
    type: 'agent_result',
    emailId,
    agentName,
    result
  });

  // Email digest (batched, sent daily)
  await queueForEmailDigest(userId, { emailId, agentName, result });
}
```

### Undo Functionality

```typescript
async function undoAgentAction(agentLogId: string, userId: string) {
  const log = await getAgentLog(agentLogId);

  if (log.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Agent-specific undo logic
  switch (log.agent_type) {
    case 'sow_generator':
      // Delete the Google Doc and database record
      await deleteGoogleDoc(log.output_data.doc_id);
      await deleteScopeOfWork(log.output_data.sow_id);
      break;

    case 'task_extractor':
      // Delete created tasks
      for (const task of log.output_data.tasks) {
        await deleteTask(task.id);
      }
      break;

    // ... other agents
  }

  // Mark as undone
  await updateAgentLog(agentLogId, { undone: true });
}
```

### Acceptance Criteria

- [ ] Pipeline processes 100+ emails/hour
- [ ] Failed jobs retry automatically
- [ ] Users notified of all agent actions
- [ ] Complete audit trail in `agent_logs`

---

## Testing Requirements

### Unit Tests
- Each agent's `canHandle` logic
- Each agent's `execute` logic
- Agent registry
- Orchestrator

### Integration Tests
- End-to-end agent execution
- Multiple agents on same email
- Error handling and retry
- Undo functionality

---

## Deliverables

1. Agent framework implemented
2. P0 agents functional (SOW Generator, Task Extractor, Document Summarizer)
3. Agent logs persisted
4. User notification system
5. Manual agent trigger from UI
6. Tests passing at >80% success rate

---

## Next Phase

With agents implemented, proceed to Phase 5 for Google Workspace integration to enable agents to create/update Docs, Sheets, etc.
