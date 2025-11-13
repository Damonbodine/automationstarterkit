# Product Requirements Document (PRD)

> Note: PRD is now organized by phases under `docs/prd/`. See `docs/prd/README.md` for the index.
## Executive Assistant AI Platform

**Version:** 1.0
**Last Updated:** January 2025
**Owner:** Damon Bodine
**Status:** Draft - In Review

---

## Executive Summary

An AI-powered executive assistant platform that automates email management, document processing, and project coordination for professionals. The system integrates with Gmail and Google Workspace to provide intelligent email classification, automated Scope of Work generation, project tracking, and task management - functioning as a lightweight digital executive assistant.

**Target Launch:** 10 weeks from start
**Initial Market:** Individual professionals and small teams managing client projects
**Business Model:** SaaS with tiered pricing (Free, Pro, Team, Enterprise)

---

## Problem Statement

### Current Pain Points

1. **Email Overload**: Professionals spend 2-3 hours daily managing email, losing focus on high-value work
2. **Manual Document Processing**: PDFs and attachments require manual reading, extraction, and data entry
3. **Scattered Project Data**: Information lives across emails, docs, sheets with no centralized view
4. **Repetitive Administrative Tasks**: Creating SOWs, updating trackers, drafting responses takes significant time
5. **Context Switching**: Jumping between Gmail, Drive, Sheets, Calendar breaks productivity
6. **Missing Action Items**: Important tasks buried in email threads get forgotten

### User Impact

- **Time Loss**: 10-15 hours/week on administrative tasks
- **Missed Opportunities**: Slow response times to clients
- **Errors**: Manual data entry mistakes in project tracking
- **Stress**: Anxiety about missing important emails or deadlines

---

## Goals & Success Metrics

### Primary Goals

1. **Reduce Email Management Time** by 70% (from 15h/week to 5h/week)
2. **Automate Document Processing** - 0 manual PDF data entry
3. **Centralize Project Information** - single source of truth
4. **Enable Proactive Task Management** - AI suggests actions before user requests

### Success Metrics (90 Days Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Sign-ups | 100+ users | Analytics |
| Email Processing Volume | 10,000+ emails/month | Database |
| Time Saved per User | 10+ hours/week | User survey |
| SOWs Generated | 200+ documents | Database |
| User Retention (30-day) | >60% | Analytics |
| Net Promoter Score | >50 | User survey |
| AI Classification Accuracy | >85% | User feedback |
| Average Response Time | <30 seconds | Monitoring |

---

## User Personas

### Persona 1: The Solo Consultant
**Name:** Sarah
**Role:** Independent Management Consultant
**Pain Points:**
- Manages 5-10 client projects simultaneously
- Receives 100+ emails daily
- Spends hours creating SOWs and project plans
- Struggles to track deliverables across clients

**Goals:**
- Quickly identify urgent client requests
- Auto-generate SOWs from client emails
- Maintain updated project status in Google Sheets
- Never miss a deadline

### Persona 2: The Small Agency Owner
**Name:** Michael
**Role:** Creative Agency Founder (5-person team)
**Pain Points:**
- Team shares info@agency.com inbox
- No visibility into who's handling what
- Manual client onboarding creates bottlenecks
- Project tracking is chaotic

**Goals:**
- Team collaboration on shared inbox
- Automated client onboarding workflows
- Centralized project dashboard
- Delegate email handling to AI when possible

### Persona 3: The Project Manager
**Name:** Jessica
**Role:** PM at a mid-size company
**Pain Points:**
- Coordinates between clients, developers, designers
- Extracts requirements from long email threads
- Updates multiple project trackers manually
- Scheduling meetings is a time sink

**Goals:**
- Auto-extract action items from emails
- Sync project data to Google Sheets automatically
- AI-drafted status update emails
- Calendar integration for seamless scheduling

---

## Features & Requirements

### Phase 1: Foundation (Weeks 1-2)

#### 1.1 User Authentication & Multi-tenancy
**Priority:** P0 (Must Have)

- Google OAuth 2.0 integration
- Secure token storage (encrypted)
- User profile management
- Data isolation per user
- Row-level security in Supabase

**Acceptance Criteria:**
- [ ] Users can sign in with Google account
- [ ] Google API scopes requested: Gmail, Drive, Docs, Sheets, Calendar
- [ ] Tokens encrypted at rest
- [ ] Users only see their own data
- [ ] Token refresh works automatically

#### 1.2 Database Schema
**Priority:** P0 (Must Have)

**Tables:**

1. **users**
   - id (uuid, primary key)
   - email (text, unique)
   - name (text)
   - google_access_token (text, encrypted)
   - google_refresh_token (text, encrypted)
   - preferences (jsonb)
   - plan_tier (enum: free, pro, team, enterprise)
   - created_at, updated_at (timestamp)

2. **email_messages**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - gmail_id (text, unique)
   - thread_id (text)
   - subject (text)
   - from_email (text)
   - from_name (text)
   - to_email (text)
   - cc_emails (text[])
   - body_plain (text)
   - body_html (text)
   - has_attachments (boolean)
   - received_at (timestamp)
   - created_at (timestamp)

3. **email_classifications**
   - id (uuid, primary key)
   - email_id (uuid, foreign key)
   - category (enum: client_request, invoice, contract, project_update, general, other)
   - priority (enum: urgent, high, medium, low)
   - sentiment (enum: positive, neutral, negative, action_required)
   - tags (text[])
   - assigned_agents (text[])
   - confidence_score (decimal)
   - classified_at (timestamp)

4. **documents**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - email_id (uuid, foreign key, nullable)
   - filename (text)
   - file_type (text)
   - gcs_url (text)
   - ocr_text (text)
   - ocr_completed_at (timestamp)
   - created_at (timestamp)

5. **projects**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - name (text)
   - client_name (text)
   - status (enum: active, paused, completed, archived)
   - start_date (date)
   - end_date (date)
   - budget (decimal)
   - google_sheet_id (text)
   - google_folder_id (text)
   - metadata (jsonb)
   - created_at, updated_at (timestamp)

6. **tasks**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - project_id (uuid, foreign key, nullable)
   - email_id (uuid, foreign key, nullable)
   - description (text)
   - status (enum: pending, in_progress, completed, cancelled)
   - priority (enum: urgent, high, medium, low)
   - due_date (timestamp)
   - assigned_to (text)
   - created_at, updated_at (timestamp)

7. **scope_of_works**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - email_id (uuid, foreign key, nullable)
   - project_id (uuid, foreign key, nullable)
   - title (text)
   - content (text)
   - google_doc_id (text)
   - status (enum: draft, pending_approval, approved, sent)
   - created_at, updated_at (timestamp)

8. **agent_logs**
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - email_id (uuid, foreign key, nullable)
   - agent_type (text)
   - action (text)
   - input_data (jsonb)
   - output_data (jsonb)
   - success (boolean)
   - error_message (text)
   - execution_time_ms (integer)
   - created_at (timestamp)

9. **email_sync_state**
   - id (uuid, primary key)
   - user_id (uuid, foreign key, unique)
   - last_sync_at (timestamp)
   - last_history_id (text)
   - sync_status (enum: active, paused, error)
   - error_message (text)
   - updated_at (timestamp)

**Acceptance Criteria:**
- [ ] All tables created with proper indexes
- [ ] Row-level security policies implemented
- [ ] Foreign key constraints in place
- [ ] Migration files version controlled
- [ ] Seed data for testing

#### 1.3 Migrate Existing OCR
**Priority:** P1 (Should Have)

- Move OCR routes to new structure
- Save OCR results to `documents` table
- Link documents to emails when applicable
- Reuse existing Google Cloud Vision integration

**Acceptance Criteria:**
- [ ] OCR functionality works as before
- [ ] Results persisted to database
- [ ] File history viewable per user

---

### Phase 2: Gmail Integration (Weeks 2-3)

#### 2.1 Gmail API Client
**Priority:** P0 (Must Have)

- Gmail API initialization per user
- Automatic token refresh
- Rate limiting (10 req/sec per user)
- Quota management
- Error handling and retry logic

**Acceptance Criteria:**
- [ ] Can fetch emails for authenticated users
- [ ] Token refresh works seamlessly
- [ ] Rate limits respected
- [ ] Graceful degradation on quota exceeded

#### 2.2 Real-time Webhook System
**Priority:** P0 (Must Have)

- Google Cloud Pub/Sub setup
- Gmail push notification subscription
- Webhook endpoint: `/api/webhooks/gmail`
- Message verification
- Security: validate Pub/Sub messages
- Queue system for processing (BullMQ + Upstash Redis)

**Architecture:**
```
Gmail → Pub/Sub → Webhook Endpoint → Verify → Queue → Process Email
```

**Acceptance Criteria:**
- [ ] Webhooks trigger on new emails
- [ ] Messages verified for authenticity
- [ ] Processing queued for reliability
- [ ] Failed jobs retry with exponential backoff
- [ ] Dead letter queue for failures

#### 2.3 Email Sync & Storage
**Priority:** P0 (Must Have)

- Initial sync: fetch last 30 days of emails
- Incremental sync via webhooks
- Store full email metadata + body
- Download and process PDF attachments automatically
- Handle email threading
- Pagination for large mailboxes

**Acceptance Criteria:**
- [ ] Initial sync completes for mailboxes with 10,000+ emails
- [ ] New emails appear within 30 seconds
- [ ] PDF attachments auto-processed with OCR
- [ ] Email threads preserved
- [ ] Progress indicator for initial sync

---

### Phase 3: AI Classification System (Weeks 3-4)

#### 3.1 Email Classification Engine
**Priority:** P0 (Must Have)

**AI Model:** Anthropic Claude 3.5 Sonnet (or latest)

**Classification Dimensions:**
1. **Category**: client_request, invoice, contract, project_update, general, other
2. **Priority**: urgent, high, medium, low
3. **Sentiment**: positive, neutral, negative, action_required
4. **Tags**: Auto-generate relevant tags (project names, topics, clients)
5. **Agent Assignment**: Recommend which agents should process this email

**Features:**
- Streaming API calls for speed
- Batch classification for initial sync
- Context-aware (uses email history)
- Confidence scoring
- Fallback to simpler rules if API fails

**Prompt Engineering:**
```
You are an executive assistant AI classifying emails. Analyze the email below and provide:
- Category (client_request, invoice, contract, project_update, general, other)
- Priority (urgent, high, medium, low)
- Sentiment (positive, neutral, negative, action_required)
- Tags (relevant keywords, project names, client names)
- Recommended agents (sow_generator, project_tracker, etc.)

Email: {email_content}
User context: {user_preferences}
Recent emails: {recent_context}
```

**Acceptance Criteria:**
- [ ] 85%+ classification accuracy (validated by user feedback)
- [ ] Classification completes within 5 seconds
- [ ] Batch processing handles 100+ emails efficiently
- [ ] User can correct classifications (feedback loop)
- [ ] Confidence scores displayed to user

#### 3.2 Smart Routing
**Priority:** P1 (Should Have)

- Rule engine for agent assignment
- User-configurable classification rules
- Learning from user feedback
- A/B testing different prompts

**Acceptance Criteria:**
- [ ] Users can create custom rules (e.g., "emails from client@example.com = high priority")
- [ ] System improves accuracy over time based on corrections
- [ ] Admin dashboard shows classification metrics

---

### Phase 4: Email Agents Framework (Weeks 4-5)

#### 4.1 Agent Architecture
**Priority:** P0 (Must Have)

**Base Agent Interface:**
```typescript
interface Agent {
  name: string;
  description: string;
  canHandle(email: Email, classification: Classification): boolean;
  execute(email: Email, context: UserContext): Promise<AgentResult>;
}
```

**Shared Capabilities:**
- Access to user's email history
- Access to user's projects, documents, tasks
- Can create/update Google Docs, Sheets
- Can draft email responses
- Logging and audit trail

**Orchestration:**
- Multiple agents can process same email
- Agents run in parallel when possible
- User approval required for sensitive actions
- Retry logic and error handling

**Acceptance Criteria:**
- [ ] Agent registry with all available agents
- [ ] New agents can be added without core changes
- [ ] All agent actions logged to `agent_logs`
- [ ] Users can enable/disable agents
- [ ] Agents can be triggered manually from UI

#### 4.2 Core Agents
**Priority:** P0 (Must Have)

**1. SOW Generator Agent**
- **Trigger**: Email classified as `client_request` with project scope
- **Process**:
  1. Extract requirements from email + attachments (OCR if needed)
  2. Generate structured SOW using Claude (with SOW template)
  3. Create Google Doc in user's Drive
  4. Save to `scope_of_works` table
  5. Notify user for review/approval
- **Output**: Google Doc link, database record

**2. Project Tracker Agent**
- **Trigger**: Email classified as `project_update`
- **Process**:
  1. Identify which project (by client name, project tag, or ask user)
  2. Extract status updates, milestones, blockers
  3. Update linked Google Sheet
  4. Create/update tasks in database
  5. Update project metadata
- **Output**: Updated Google Sheet, task list

**3. Invoice Processor Agent**
- **Trigger**: Email classified as `invoice`
- **Process**:
  1. Extract invoice data (amount, due date, vendor, invoice #)
  2. OCR PDF attachment if present
  3. Add row to "Invoices" Google Sheet
  4. Create task for payment if due soon
  5. Tag email with invoice number
- **Output**: Google Sheet entry, optional task

**4. Document Summarizer Agent**
- **Trigger**: Email with long body (>1000 words) or PDF attachment
- **Process**:
  1. Extract full text (OCR if PDF)
  2. Generate summary using Claude (key points, action items)
  3. Store summary with email
  4. Show summary in email preview
- **Output**: Summary text, extracted action items

**5. Response Drafter Agent**
- **Trigger**: Email with `action_required` sentiment
- **Process**:
  1. Analyze email content and context
  2. Generate appropriate response draft
  3. Include relevant information from project data
  4. Present to user for approval/editing
  5. Optionally: send directly for simple acknowledgments
- **Output**: Draft email reply

**6. Calendar Agent**
- **Trigger**: Email mentions meeting, schedule, availability
- **Process**:
  1. Extract date/time suggestions
  2. Check user's Google Calendar availability
  3. Propose meeting times or confirm existing
  4. Create calendar event (draft or confirmed)
  5. Send calendar invite
- **Output**: Calendar event, draft response

**7. Task Extractor Agent**
- **Trigger**: All emails (runs on everything)
- **Process**:
  1. Identify action items and deadlines
  2. Create tasks in database
  3. Link tasks to projects if applicable
  4. Set priority and due dates
  5. Notify user of new tasks
- **Output**: Task list

**Priority for Initial Launch:**
1. SOW Generator (P0)
2. Task Extractor (P0)
3. Document Summarizer (P0)
4. Project Tracker (P1)
5. Response Drafter (P1)
6. Invoice Processor (P2)
7. Calendar Agent (P2)

**Acceptance Criteria:**
- [ ] All P0 agents functional and tested
- [ ] Each agent has success rate >80%
- [ ] User can approve/reject agent actions
- [ ] Agent execution time <30 seconds
- [ ] Clear UI showing what each agent did

#### 4.3 Agent Execution Pipeline
**Priority:** P0 (Must Have)

**Flow:**
```
New Email → Classify → Route to Agents → Execute in Parallel →
→ Log Results → Notify User → User Approves/Rejects
```

**Features:**
- Background job processing (BullMQ)
- Retry failed agent executions (3 attempts)
- User notification system:
  - In-app notifications
  - Email digest (daily summary)
  - Real-time updates via WebSocket
- User can undo agent actions

**Acceptance Criteria:**
- [ ] Pipeline processes 100+ emails/hour
- [ ] Failed jobs retry automatically
- [ ] Users notified of all agent actions
- [ ] Complete audit trail in `agent_logs`

---

### Phase 5: Google Workspace Integration (Weeks 5-6)

#### 5.1 Google Drive
**Priority:** P0 (Must Have)

- Create folders per project/client
- Upload/download files
- Share files with specific permissions
- Search for files
- Track file versions

**Acceptance Criteria:**
- [ ] Agents can create Google Docs/Sheets
- [ ] Files organized in logical folder structure
- [ ] Users can access files from UI
- [ ] Proper permission management

#### 5.2 Google Sheets
**Priority:** P0 (Must Have)

- Create sheets from templates
- Update cells programmatically
- Preserve formulas and formatting
- Batch updates for performance
- Read data for context

**Templates:**
- Project Tracker
- Invoice Log
- Client Contact List
- Task List

**Acceptance Criteria:**
- [ ] Can create sheets from templates
- [ ] Updates reflect in real-time
- [ ] Formulas not overwritten
- [ ] Handles large sheets (1000+ rows)

#### 5.3 Google Docs
**Priority:** P0 (Must Have)

- Create docs from templates
- Insert text at specific locations
- Format text (headers, lists, tables)
- Add comments
- Export to PDF

**Templates:**
- Scope of Work
- Project Proposal
- Status Report
- Meeting Notes

**Acceptance Criteria:**
- [ ] SOWs generated with proper formatting
- [ ] Templates customizable by user
- [ ] Can export to PDF
- [ ] Comments work for feedback

#### 5.4 Google Calendar
**Priority:** P1 (Should Have)

- Check availability
- Create events
- Send invites
- Update/cancel events
- Set reminders

**Acceptance Criteria:**
- [ ] Calendar Agent can schedule meetings
- [ ] Availability checking works
- [ ] Invites sent to attendees
- [ ] Conflicts detected

#### 5.5 Google Maps & Places
**Priority:** P2 (Nice to Have)

- Extract addresses from emails
- Validate addresses
- Get place details
- Calculate travel time
- Add to calendar events

**Acceptance Criteria:**
- [ ] Addresses auto-validated
- [ ] Travel time added to calendar events
- [ ] Location details enriched

---

### Phase 6: Project Management System (Weeks 6-7)

#### 6.1 Project Dashboard
**Priority:** P0 (Must Have)

- Auto-create projects from SOW emails
- Link emails, documents, tasks to projects
- Timeline visualization
- Milestone tracking
- Budget tracking
- Status overview (health indicator)

**Acceptance Criteria:**
- [ ] Projects auto-created when SOW generated
- [ ] All related items linked to project
- [ ] Visual timeline with milestones
- [ ] Budget vs. actual tracking
- [ ] Health indicators (green/yellow/red)

#### 6.2 Task Management
**Priority:** P0 (Must Have)

- AI-extracted tasks from emails
- Manual task creation
- Task assignment (self or team)
- Due dates with reminders
- Status tracking (pending, in progress, done)
- Priority levels
- Link tasks to projects and emails

**Acceptance Criteria:**
- [ ] Tasks extracted automatically
- [ ] Users can edit/delete tasks
- [ ] Reminders sent before due date
- [ ] Task completion tracked
- [ ] Filter/sort tasks by various criteria

#### 6.3 Reporting
**Priority:** P1 (Should Have)

- Weekly/monthly project summaries (Claude-generated)
- Automated status reports to clients
- Analytics dashboard:
  - Email volume trends
  - Agent activity
  - Project health
  - Time saved metrics
- Export reports to PDF/Google Docs

**Acceptance Criteria:**
- [ ] Weekly summary emails sent
- [ ] Status reports generated on demand
- [ ] Dashboard shows key metrics
- [ ] Reports exportable

---

### Phase 7: UI/UX (Weeks 7-8)

#### 7.1 Dashboard (Landing Page)
**Priority:** P0 (Must Have)

**Components:**
- **Header**: Logo, user menu, notifications bell
- **Quick Stats**: Unread emails, pending tasks, active projects
- **Priority Queue**: Emails needing action (sorted by urgency)
- **Recent Agent Activity**: Last 10 agent actions with approve/reject
- **Project Overview**: Cards for each active project
- **Quick Actions**: Compose, create project, run agent manually

**Acceptance Criteria:**
- [ ] Loads in <2 seconds
- [ ] Real-time updates via WebSocket
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)

#### 7.2 Email Management
**Priority:** P0 (Must Have)

**Inbox View:**
- List view with classification badges
- Smart filters (priority, category, agent-processed)
- Search (full-text, by sender, by date)
- Bulk actions (archive, delete, classify)

**Email Detail View:**
- Threaded conversation
- Classification badges and tags
- Agent action history ("SOW generated", "Task created")
- Attachments with OCR results
- Related items (project, tasks, documents)
- Actions: Reply, Forward, Assign to project, Run agent

**Acceptance Criteria:**
- [ ] Inbox loads 100+ emails quickly
- [ ] Filters work instantly
- [ ] Search returns results <1 second
- [ ] Email detail shows full context
- [ ] Can trigger agents manually

#### 7.3 Project View
**Priority:** P0 (Must Have)

- Project list (active, paused, archived)
- Project detail page:
  - Overview (status, dates, budget)
  - Linked emails
  - Linked documents
  - Tasks
  - Timeline
  - Activity feed
- Edit project details
- Archive/delete projects

**Acceptance Criteria:**
- [ ] All project data visible in one place
- [ ] Can navigate to related items
- [ ] Timeline visualization clear
- [ ] Easy to update project status

#### 7.4 Settings & Configuration
**Priority:** P1 (Should Have)

**Pages:**
1. **Profile**: Name, email, timezone, preferences
2. **Integrations**: Connected Google account, reconnect if needed
3. **Agents**: Enable/disable agents, configure behavior
4. **Classification Rules**: Custom rules for email classification
5. **Templates**: SOW, Docs, Sheets templates (edit/upload)
6. **Notifications**: Email digest frequency, in-app notification settings
7. **Billing**: Plan tier, usage stats, upgrade/downgrade

**Acceptance Criteria:**
- [ ] Users can customize agent behavior
- [ ] Templates editable via UI
- [ ] Notification preferences saved
- [ ] Billing integration (Stripe)

#### 7.5 Mobile Responsive
**Priority:** P0 (Must Have)

- Fully responsive design (Tailwind breakpoints)
- Mobile navigation (hamburger menu)
- Touch-friendly UI elements
- Progressive Web App (PWA) capabilities

**Acceptance Criteria:**
- [ ] Works on screens from 320px to 4K
- [ ] Touch targets at least 44x44px
- [ ] Can add to home screen (PWA)
- [ ] Offline mode shows cached data

---

### Phase 8: Advanced Features (Weeks 8-9)

#### 8.1 Learning & Personalization
**Priority:** P2 (Nice to Have)

- User feedback on classifications (correct/incorrect)
- Learn user preferences over time
- Custom classification rules from patterns
- Agent behavior tuning per user
- Template customization based on usage

**Acceptance Criteria:**
- [ ] Classification accuracy improves with feedback
- [ ] System suggests custom rules
- [ ] Templates adapt to user's style

#### 8.2 Collaboration (Team Features)
**Priority:** P2 (Nice to Have)

- Team accounts (shared inbox)
- Assign emails to team members
- Shared projects
- Approval workflows (e.g., SOW needs manager approval)
- Team activity feed

**Acceptance Criteria:**
- [ ] Multiple users can access shared inbox
- [ ] Email assignment works
- [ ] Approval workflows configurable
- [ ] Team dashboard shows all activity

#### 8.3 Security & Compliance
**Priority:** P1 (Should Have)

- End-to-end encryption for sensitive data
- GDPR compliance:
  - Data export (download all user data)
  - Data deletion (right to be forgotten)
  - Privacy policy and terms of service
- Audit logs (all user actions)
- Two-factor authentication (2FA)
- SOC 2 compliance readiness

**Acceptance Criteria:**
- [ ] Sensitive data encrypted (tokens, email content)
- [ ] Users can export all their data
- [ ] Users can delete account and all data
- [ ] Audit logs retained for 90 days
- [ ] 2FA available

---

### Phase 9: Testing & Deployment (Weeks 9-10)

#### 9.1 Testing
**Priority:** P0 (Must Have)

**Test Coverage:**
- Unit tests (80%+ coverage)
  - Agent logic
  - Classification
  - API routes
- Integration tests
  - Gmail sync
  - Webhook processing
  - Google API interactions
- End-to-end tests
  - User sign-up flow
  - Email processing pipeline
  - Agent execution
- Load testing
  - 1000 emails processed in <10 minutes
  - 100 concurrent users
- Security testing
  - OWASP top 10 vulnerabilities
  - Penetration testing

**Acceptance Criteria:**
- [ ] All tests passing
- [ ] CI/CD pipeline runs tests automatically
- [ ] Load tests meet performance targets
- [ ] Security vulnerabilities addressed

#### 9.2 Deployment
**Priority:** P0 (Must Have)

**Infrastructure:**
- **Frontend + API**: Vercel (serverless functions for API routes)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Queue/Redis**: Upstash (serverless Redis for BullMQ)
- **Pub/Sub**: Google Cloud Pub/Sub
- **File Storage**: Google Cloud Storage (existing bucket)
- **Monitoring**: Vercel Analytics, Sentry for error tracking
- **Logging**: Vercel Logs + custom logging to Supabase

**Environment Variables:**
- Database URL (Supabase)
- Redis URL (Upstash)
- Google Cloud credentials
- Anthropic API key
- NextAuth secret
- Google OAuth client ID/secret
- Pub/Sub topic/subscription

**Deployment Process:**
1. Push to `main` branch
2. CI runs tests
3. Build on Vercel
4. Run database migrations
5. Deploy to production
6. Health checks
7. Rollback if issues

**Acceptance Criteria:**
- [ ] Deployments automated via Git push
- [ ] Zero-downtime deployments
- [ ] Rollback works in <5 minutes
- [ ] Environment variables secured

#### 9.3 Monitoring & Observability
**Priority:** P0 (Must Have)

**Metrics to Track:**
- API response times (p50, p95, p99)
- Error rates (by endpoint, by agent)
- Email processing latency
- Queue depth and processing rate
- Database query performance
- User activity (DAU, WAU, MAU)
- Agent success rates
- Classification accuracy

**Alerts:**
- Error rate >5%
- API response time >10 seconds
- Queue backed up >1000 jobs
- Database connection errors
- Webhook failures

**Dashboards:**
- System health (uptime, errors, latency)
- User metrics (signups, retention, engagement)
- Agent performance (executions, success rate, avg time)
- Business metrics (emails processed, SOWs generated, time saved)

**Acceptance Criteria:**
- [ ] All critical metrics tracked
- [ ] Alerts fire correctly
- [ ] On-call engineer notified for critical issues
- [ ] Dashboards accessible to team

#### 9.4 Documentation
**Priority:** P1 (Should Have)

**User Documentation:**
- Getting started guide
- Feature tutorials (video + text)
- Agent explanations
- Template customization
- Troubleshooting / FAQ
- Privacy and security info

**Developer Documentation:**
- Architecture overview
- API documentation
- Database schema
- Adding new agents
- Contributing guide
- Deployment guide

**Acceptance Criteria:**
- [ ] User docs published and accessible
- [ ] Video tutorials for key features
- [ ] API docs auto-generated (OpenAPI/Swagger)
- [ ] Developer setup works from README

#### 9.5 Beta Launch
**Priority:** P0 (Must Have)

**Plan:**
1. **Week 9**: Internal testing with 3-5 beta users
2. **Week 10**: Public beta launch to 50-100 users
3. **Feedback Collection**: User interviews, surveys, in-app feedback
4. **Iteration**: Fix critical bugs, improve UX based on feedback
5. **Marketing**: Blog post, Product Hunt launch, social media

**Beta User Criteria:**
- Professionals managing 5+ client projects
- Receive 50+ emails daily
- Use Google Workspace
- Willing to provide detailed feedback

**Acceptance Criteria:**
- [ ] 50+ beta users signed up
- [ ] <5 critical bugs reported
- [ ] NPS score >40
- [ ] 60%+ retention after 30 days
- [ ] Product Hunt launch successful (>100 upvotes)

---

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   Dashboard    │  │  Email Inbox   │  │  Project View  │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Next.js Frontend    │
                    │  (Vercel Deployment)  │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Next.js API Routes   │
                    │  (Serverless Functions)│
                    └───┬───────────┬───────┘
                        │           │
        ┌───────────────┼───────────┼────────────────┐
        │               │           │                │
┌───────▼──────┐ ┌──────▼─────┐ ┌──▼──────────┐ ┌──▼──────────┐
│   Supabase   │ │ Google APIs│ │ Claude API  │ │ Upstash     │
│  PostgreSQL  │ │  (Gmail,   │ │ (Anthropic) │ │   Redis     │
│     +RLS     │ │ Drive, etc)│ │             │ │  (BullMQ)   │
└──────────────┘ └──────┬─────┘ └─────────────┘ └──────┬──────┘
                        │                               │
                ┌───────▼──────────┐           ┌────────▼───────┐
                │  Google Cloud    │           │  Queue Workers │
                │  Pub/Sub (Gmail  │           │  (Background   │
                │  Push Webhook)   │           │   Processing)  │
                └───────┬──────────┘           └────────────────┘
                        │
                ┌───────▼────────┐
                │ Webhook Route  │
                │ /api/webhooks/ │
                │     gmail      │
                └────────────────┘
```

### Data Flow: Email Processing

```
1. New Email Arrives in User's Gmail
   ↓
2. Gmail Pub/Sub Push Notification
   ↓
3. POST to /api/webhooks/gmail
   ↓
4. Verify Pub/Sub message signature
   ↓
5. Add job to BullMQ: "fetch-email"
   ↓
6. Worker fetches email via Gmail API
   ↓
7. Save to email_messages table
   ↓
8. Download attachments to GCS
   ↓
9. OCR PDFs (if any)
   ↓
10. Add job to BullMQ: "classify-email"
    ↓
11. Worker calls Claude API for classification
    ↓
12. Save to email_classifications table
    ↓
13. Add jobs for each assigned agent
    ↓
14. Agent workers execute in parallel
    ↓
15. Agents create Docs/Sheets/Tasks
    ↓
16. Save results to agent_logs
    ↓
17. Notify user (WebSocket + email digest)
    ↓
18. User reviews and approves/rejects
```

### Tech Stack Summary

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Frontend | Next.js 16 (App Router), React 19 | Modern, performant, great DX |
| Styling | Tailwind CSS 4 | Rapid development, responsive |
| Language | TypeScript 5 | Type safety, better DX |
| Authentication | NextAuth.js | Google OAuth integration |
| Database | Supabase (PostgreSQL) | Managed, RLS, real-time |
| ORM | Direct SQL (Supabase client) | No Prisma complexity |
| AI | Anthropic Claude 3.5+ | Best reasoning for complex tasks |
| Queue | BullMQ + Upstash Redis | Reliable background processing |
| Google APIs | @google-cloud/* packages | Gmail, Drive, Docs, Sheets, etc |
| File Storage | Google Cloud Storage | Existing, integrated |
| Webhooks | Google Cloud Pub/Sub | Real-time Gmail push |
| Deployment | Vercel | Zero-config, serverless |
| Monitoring | Sentry + Vercel Analytics | Error tracking, performance |
| Payments | Stripe | Standard for SaaS billing |

---

## API Specifications

### Authentication Endpoints

#### POST /api/auth/signin
Sign in with Google OAuth

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": "session_token"
}
```

### Email Endpoints

#### GET /api/emails
List user's emails with filters

**Query Params:**
- `page` (number): Page number
- `limit` (number): Items per page (max 100)
- `category` (string): Filter by category
- `priority` (string): Filter by priority
- `unread` (boolean): Only unread emails
- `search` (string): Full-text search

**Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "subject": "Project Proposal Request",
      "from": "client@example.com",
      "received_at": "2025-01-15T10:30:00Z",
      "classification": {
        "category": "client_request",
        "priority": "high",
        "tags": ["proposal", "new_client"]
      },
      "has_attachments": true,
      "unread": true
    }
  ],
  "total": 1523,
  "page": 1,
  "pages": 16
}
```

#### GET /api/emails/:id
Get email details

**Response:**
```json
{
  "id": "uuid",
  "subject": "Project Proposal Request",
  "from": { "email": "client@example.com", "name": "Jane Client" },
  "to": ["user@example.com"],
  "cc": [],
  "body": "...",
  "received_at": "2025-01-15T10:30:00Z",
  "classification": { ... },
  "attachments": [
    {
      "id": "uuid",
      "filename": "requirements.pdf",
      "ocr_text": "..."
    }
  ],
  "agent_actions": [
    {
      "agent": "sow_generator",
      "action": "Created SOW draft",
      "result": { "doc_id": "google_doc_id" },
      "timestamp": "2025-01-15T10:32:00Z"
    }
  ],
  "related_project": { "id": "uuid", "name": "Acme Corp Website" }
}
```

#### POST /api/emails/:id/classify
Manually trigger classification

**Response:**
```json
{
  "classification": {
    "category": "client_request",
    "priority": "high",
    "sentiment": "positive",
    "tags": ["proposal", "new_client"],
    "confidence": 0.92
  }
}
```

### Agent Endpoints

#### POST /api/agents/:agentType/execute
Manually execute an agent on an email

**Request:**
```json
{
  "email_id": "uuid",
  "params": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "doc_id": "google_doc_id",
    "message": "SOW created successfully"
  }
}
```

#### GET /api/agents/logs
Get agent execution logs

**Query Params:**
- `agent_type` (string): Filter by agent
- `email_id` (uuid): Filter by email
- `limit` (number)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "agent_type": "sow_generator",
      "action": "create_sow",
      "success": true,
      "execution_time_ms": 3421,
      "created_at": "2025-01-15T10:32:00Z"
    }
  ]
}
```

### Project Endpoints

#### GET /api/projects
List user's projects

#### POST /api/projects
Create new project

#### GET /api/projects/:id
Get project details with linked emails, tasks, documents

#### PUT /api/projects/:id
Update project

### Task Endpoints

#### GET /api/tasks
List tasks with filters

#### POST /api/tasks
Create task

#### PUT /api/tasks/:id
Update task

### Webhook Endpoints

#### POST /api/webhooks/gmail
Receive Gmail push notifications from Pub/Sub

**Request (from Pub/Sub):**
```json
{
  "message": {
    "data": "base64_encoded_data",
    "messageId": "...",
    "publishTime": "..."
  }
}
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## Security & Privacy

### Data Security

1. **Encryption at Rest**
   - Database: Supabase encryption
   - Google tokens: Encrypted before storage
   - Sensitive email content: Consider encryption for enterprise tier

2. **Encryption in Transit**
   - HTTPS only (TLS 1.3)
   - Secure WebSocket connections (WSS)

3. **Access Control**
   - Row Level Security (RLS) in Supabase
   - User can only access their own data
   - Service accounts for Google API access

4. **Authentication**
   - Google OAuth 2.0
   - No password storage (delegated to Google)
   - Optional 2FA for additional security
   - Session tokens with expiration

5. **API Security**
   - Rate limiting per user (100 req/min)
   - CORS restrictions
   - Webhook signature verification
   - Input validation and sanitization

### Privacy Considerations

1. **Data Minimization**
   - Only store necessary email data
   - Option to exclude sensitive emails from processing

2. **User Control**
   - Users can delete emails from our system
   - Users can disable specific agents
   - Users can opt-out of AI processing for sensitive emails

3. **Transparency**
   - Clear privacy policy
   - Explain what data is collected and why
   - Show all agent actions in audit log

4. **GDPR Compliance**
   - Data export: Users can download all their data
   - Right to be forgotten: Delete account and all data
   - Data processing agreement for EU users
   - Cookie consent (if using analytics cookies)

5. **Third-party Data Sharing**
   - Claude API: Email content sent for classification (Anthropic's privacy policy applies)
   - Google APIs: Only access what user authorizes
   - No data sold to third parties
   - Clear disclosure of all third-party services

### Compliance

- **GDPR**: EU user data protection
- **CCPA**: California privacy rights
- **SOC 2**: Security controls (future)
- **Google API Terms of Service**: Compliance required

---

## Pricing & Business Model

### Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/month | - 100 emails/month<br>- 5 SOWs/month<br>- Basic agents<br>- 1 GB storage |
| **Pro** | $29/month | - Unlimited emails<br>- Unlimited SOWs<br>- All agents<br>- 10 GB storage<br>- Priority support<br>- Custom templates |
| **Team** | $99/month<br>(up to 5 users) | - Everything in Pro<br>- Shared inbox<br>- Team collaboration<br>- Approval workflows<br>- 50 GB storage<br>- Team analytics |
| **Enterprise** | Custom | - Everything in Team<br>- Unlimited users<br>- SSO/SAML<br>- Dedicated support<br>- SLA guarantee<br>- On-premise option<br>- Custom integrations |

### Revenue Projections (Year 1)

- **Month 3**: 100 users (80 free, 15 pro, 5 team) = $735/mo
- **Month 6**: 500 users (350 free, 120 pro, 30 team) = $6,450/mo
- **Month 12**: 2,000 users (1200 free, 650 pro, 140 team, 10 enterprise) = $32,710/mo

**Annual Run Rate (Month 12):** ~$390K

### Cost Structure

**Variable Costs (per user):**
- Claude API: ~$10-20/month (heavy user)
- Supabase: ~$0.50/month
- Upstash Redis: ~$0.25/month
- Google Cloud Storage: ~$0.10/month
- **Total**: ~$11-21/user/month

**Fixed Costs:**
- Vercel Pro: $20/month
- Domain & SSL: $15/month
- Monitoring (Sentry): $26/month
- Email service (transactional): $10/month
- **Total**: ~$71/month

**Margin:** Pro tier = ~$8-18/user, Team tier = ~$15-20/user

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Gmail API quota exceeded | High | Medium | Rate limiting, queue management, upgrade quota |
| Claude API costs spike | High | Medium | Caching, batch processing, cheaper models for simple tasks |
| User privacy concerns | High | Low | Transparent privacy policy, encryption, GDPR compliance |
| Google changes API terms | Medium | Low | Monitor API changes, have fallback plan |
| Poor classification accuracy | High | Medium | Prompt engineering, user feedback loop, A/B testing |
| Slow email processing | Medium | Medium | Optimize queue workers, parallel processing, caching |
| Security breach | High | Low | Regular security audits, pen testing, bug bounty |
| Competition (Gmail plugins) | Medium | High | Focus on full EA capabilities, not just email |
| Low user retention | High | Medium | Onboarding improvements, engagement features, support |
| Infrastructure costs grow faster than revenue | High | Medium | Monitor usage, optimize API calls, tiered pricing |

---

## Success Criteria

### Launch Success (Week 10)
- [ ] 50+ beta users signed up
- [ ] System processes 1,000+ emails without errors
- [ ] <5 critical bugs
- [ ] NPS >40
- [ ] 60%+ 30-day retention

### 3-Month Success
- [ ] 100+ paying users
- [ ] $1,500+ MRR
- [ ] Classification accuracy >85%
- [ ] Average 10+ hours saved per user/week
- [ ] NPS >50

### 6-Month Success
- [ ] 500+ total users
- [ ] $5,000+ MRR
- [ ] 65%+ retention
- [ ] Feature requests driving roadmap
- [ ] Profitable unit economics

### 12-Month Success
- [ ] 2,000+ total users
- [ ] $30,000+ MRR
- [ ] Team tier adopted by 10+ companies
- [ ] 1-2 enterprise customers
- [ ] Positive cash flow

---

## Open Questions & Decisions Needed

1. **Agent Approval Workflow**: Should agents auto-execute or always require user approval?
   - **Option A**: Auto-execute low-risk actions (create tasks), require approval for high-risk (send emails, create invoices)
   - **Option B**: Always require approval initially, learn user preferences over time
   - **Decision**: ?

2. **Data Retention**: How long should we keep emails and documents?
   - **Option A**: Keep forever (user manages deletion)
   - **Option B**: Auto-delete after 1 year (configurable)
   - **Option C**: Tiered by plan (free = 3 months, pro = unlimited)
   - **Decision**: ?

3. **White Labeling**: Should we allow agencies to white-label the platform?
   - **Pros**: Additional revenue stream, faster growth
   - **Cons**: Support complexity, brand dilution
   - **Decision**: ?

4. **Mobile App**: Native mobile app or PWA only?
   - **Option A**: PWA for MVP, native app later
   - **Option B**: React Native app from start
   - **Decision**: PWA for MVP

5. **Integrations**: Which other tools to integrate beyond Google Workspace?
   - Candidates: Slack, Asana, Trello, QuickBooks, Salesforce
   - **Decision**: Google Workspace only for MVP, others in roadmap

---

## Appendix

### Glossary

- **Agent**: AI-powered service that performs specific tasks (e.g., SOW Generator)
- **Classification**: Categorizing emails by type, priority, sentiment
- **EA**: Executive Assistant
- **OCR**: Optical Character Recognition (text extraction from images/PDFs)
- **RLS**: Row Level Security (database access control)
- **SOW**: Scope of Work document
- **Webhook**: Real-time HTTP callback for events

### References

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [BullMQ](https://docs.bullmq.io/)

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Jan 2025 | Initial PRD | Damon Bodine |

---

**Next Steps:**
1. Review and approve this PRD
2. Set up Supabase project
3. Create database schema with migrations
4. Begin Phase 1 implementation
