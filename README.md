# Executive Assistant AI

> An AI-powered executive assistant platform that automates email management, document processing, and project coordination for professionals.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Live Demo:** Coming soon

---

## 🎯 What This Does

This is an **AI-first executive assistant** that integrates with your Gmail and Google Workspace to:

### Core Capabilities

1. **Intelligent Email Processing**
   - Automatically classifies emails by category, priority, and sentiment
   - Extracts action items and deadlines
   - Groups emails into conversation threads
   - Generates AI-powered summaries of long threads

2. **AI Agents for Automation**
   - **SOW Generator**: Creates Scope of Work documents from client emails
   - **Task Extractor**: Identifies and creates tasks from emails
   - **Document Summarizer**: Summarizes attachments (PDFs, Docs)
   - Agents work asynchronously via queue system

3. **Document Management**
   - OCR for PDFs and images
   - Automatic upload to Google Drive
   - Extract data to Google Sheets
   - Full-text search across documents

4. **Project Tracking**
   - Auto-creates projects from client emails
   - Syncs with Google Sheets for project tracking
   - Milestone tracking and budget management
   - Project health monitoring

5. **Google Workspace Integration**
   - Gmail sync with real-time webhook notifications
   - Google Drive for file storage
   - Google Docs for document generation
   - Google Sheets for data extraction
   - Google Calendar for scheduling

### Technical Highlights

- **Real-time Email Sync**: Uses Google Cloud Pub/Sub for instant email notifications
- **Background Processing**: BullMQ queues handle long-running AI tasks
- **AI-Powered**: Claude (Anthropic) for classification and content generation
- **Secure**: Row-level security, encrypted tokens, OAuth 2.0
- **Scalable**: Serverless architecture on Vercel + Supabase

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Emails  │  │ Projects │  │Documents │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                ┌────────▼────────┐
                │  Next.js App    │
                │   (Vercel)      │
                └────────┬────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼─────┐  ┌──────▼──────┐
│   Supabase   │  │  Upstash   │  │   Google    │
│  PostgreSQL  │  │   Redis    │  │   Cloud     │
│     +RLS     │  │  (BullMQ)  │  │  (Gmail,    │
│              │  │            │  │   Drive,    │
│              │  │            │  │   Docs)     │
└──────────────┘  └──────┬─────┘  └──────┬──────┘
                         │                │
                  ┌──────▼────────┐  ┌────▼────┐
                  │ Queue Workers │  │ Pub/Sub │
                  │ (Background)  │  │Webhooks │
                  └───────────────┘  └─────────┘
```

### Data Flow: Email Processing

```
1. Email arrives → Gmail
2. Pub/Sub notification → /api/webhooks/gmail
3. Queue job: fetch-email → Worker fetches via Gmail API
4. Save to database → email_messages table
5. Queue job: classify-email → Claude AI classification
6. Save classification → email_classifications table
7. Queue agent jobs → Parallel agent execution
8. Agents create output → Docs, Sheets, Tasks
9. Results saved → agent_logs table
10. User notified → Dashboard updates
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ and npm
- Google Cloud Project with APIs enabled
- Supabase account (PostgreSQL database)
- Upstash account (Redis for queues)
- Anthropic API key (Claude)
- Vercel account (deployment)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/executive-assistant-ai.git
cd executive-assistant-ai
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Fill in your credentials in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here  # Generate: openssl rand -base64 32

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_APPLICATION_CREDENTIALS_BASE64=base64-encoded-service-account-json
GCS_BUCKET_NAME=your-bucket-name

# Pub/Sub (for Gmail webhooks)
PUBSUB_TOPIC=gmail-notifications
PUBSUB_SUBSCRIPTION=gmail-notifications-sub

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Redis (Upstash)
REDIS_URL=redis://default:xxxxx@us1-xxxxx.upstash.io:6379

# Encryption
ENCRYPTION_KEY=64-character-hex-string  # Generate: openssl rand -hex 32
```

### 3. Database Setup

Run Supabase migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

Or manually run migrations from `supabase/migrations/` in order.

### 4. Google Cloud Setup

1. **Enable APIs** in Google Cloud Console:
   - Gmail API
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Cloud Pub/Sub API

2. **Create OAuth 2.0 Credentials**:
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Add required scopes (see `.env.local.example`)

3. **Create Service Account**:
   - Download JSON key
   - Base64 encode: `cat service-account.json | base64`
   - Add to `GOOGLE_APPLICATION_CREDENTIALS_BASE64`

4. **Set up Pub/Sub** (for Gmail webhooks):
   ```bash
   # Create topic
   gcloud pubsub topics create gmail-notifications

   # Create subscription with push endpoint
   gcloud pubsub subscriptions create gmail-notifications-sub \
     --topic=gmail-notifications \
     --push-endpoint=https://your-domain.com/api/webhooks/gmail
   ```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6. Run Background Workers

In a separate terminal:

```bash
npm run workers
```

Or set `RUN_WORKERS_IN_PROCESS=1` in `.env.local` to run workers in-process during development.

---

## 📁 Project Structure

```
.
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes (serverless functions)
│   │   │   ├── auth/             # NextAuth endpoints
│   │   │   ├── emails/           # Email management endpoints
│   │   │   ├── documents/        # Document processing endpoints
│   │   │   ├── projects/         # Project management endpoints
│   │   │   ├── tasks/            # Task management endpoints
│   │   │   ├── agents/           # AI agent endpoints
│   │   │   └── webhooks/         # Gmail Pub/Sub webhook
│   │   ├── dashboard/            # Dashboard page
│   │   ├── emails/               # Email inbox UI
│   │   ├── projects/             # Project management UI
│   │   ├── documents/            # Document library UI
│   │   └── settings/             # User settings
│   ├── components/               # React components
│   │   ├── email/                # Email-related components
│   │   ├── projects/             # Project components
│   │   ├── agents/               # Agent status components
│   │   ├── dashboard/            # Dashboard widgets
│   │   └── ui/                   # Reusable UI components
│   ├── lib/                      # Core business logic
│   │   ├── ai/                   # AI/LLM integrations
│   │   │   ├── classifier.ts     # Email classification
│   │   │   └── agents/           # AI agent implementations
│   │   ├── gmail/                # Gmail API client
│   │   ├── google/               # Google Workspace clients
│   │   ├── queue/                # BullMQ queue setup
│   │   ├── db/                   # Database client
│   │   ├── auth/                 # Authentication config
│   │   └── encryption/           # Token encryption
│   └── types/                    # TypeScript types
├── scripts/                      # Utility scripts
│   ├── start-workers.ts          # Worker process entry point
│   └── analyze-classification.ts # Classification analysis
├── supabase/                     # Database migrations
│   └── migrations/               # SQL migration files
├── infrastructure/               # Setup scripts
│   ├── setup-supabase.sh         # Database setup
│   ├── generate-secrets.sh       # Secret generation
│   └── check-setup.sh            # Environment validation
├── docs/                         # Documentation
│   ├── 00-overview.md            # System overview
│   ├── 00-architecture.md        # Technical architecture
│   ├── 00-database-schema.md     # Database schema
│   └── 00-api-specs.md           # API documentation
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
└── next.config.mjs               # Next.js config
```

---

## 🧠 AI Agents

The system includes several AI agents that process emails asynchronously:

### Available Agents

| Agent | Trigger | Output | Description |
|-------|---------|--------|-------------|
| `sow-generator` | Client request emails | Google Doc | Generates Scope of Work documents |
| `task-extractor` | Emails with action items | Tasks in DB | Extracts and creates tasks |
| `document-summarizer` | Emails with attachments | Summary text | Summarizes PDF/Doc content |

### How Agents Work

1. **Email classified** by AI → Determines which agents to run
2. **Jobs queued** in BullMQ → One job per agent
3. **Workers pick up jobs** → Process asynchronously
4. **Agent executes** → Calls Claude API, generates output
5. **Results saved** → `agent_logs` table
6. **User notified** → Dashboard shows completion

### Adding New Agents

Create a new agent in `src/lib/ai/agents/`:

```typescript
// src/lib/ai/agents/my-new-agent.ts
import { anthropic } from '../anthropic-client';

export async function myNewAgent(emailId: string, userId: string) {
  // 1. Fetch email data from database
  const email = await supabase
    .from('email_messages')
    .select('*')
    .eq('id', emailId)
    .single();

  // 2. Call Claude API with prompt
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Process this email: ${email.body_plain}`
    }]
  });

  // 3. Process response and create output
  const result = response.content[0].text;

  // 4. Save to database or create Google Doc/Sheet
  await supabase.from('agent_logs').insert({
    agent_name: 'my-new-agent',
    email_id: emailId,
    result: result,
    status: 'completed'
  });

  return result;
}
```

Register in queue worker (`src/lib/queue/workers.ts`):

```typescript
import { myNewAgent } from '../ai/agents/my-new-agent';

// Add to worker definitions
emailQueue.process('my-new-agent', async (job) => {
  await myNewAgent(job.data.emailId, job.data.userId);
});
```

Update classification to trigger agent (`src/lib/ai/classifier.ts`):

```typescript
// Add to classification logic
if (category === 'specific_type') {
  assigned_agents.push('my-new-agent');
}
```

---

## 🔌 API Reference

### Authentication

All API routes require authentication via NextAuth session cookies.

```typescript
// Get current user
const session = await getServerSession(authOptions);
const userId = session.user.id;
```

### Key Endpoints

#### Email Management

```
GET    /api/emails                  # List user's emails
GET    /api/emails/[emailId]        # Get single email
POST   /api/emails/sync             # Trigger email sync
POST   /api/emails/classify/batch   # Batch classify emails
POST   /api/emails/[emailId]/reply  # Send reply
GET    /api/emails/[emailId]/attachments  # List attachments
```

#### Document Processing

```
POST   /api/documents/upload        # Upload document
GET    /api/documents               # List documents
POST   /api/documents/[id]/extract-to-sheet  # Extract to Sheets
POST   /api/documents/sync/google-drive      # Sync from Drive
```

#### Projects

```
GET    /api/projects                # List projects
POST   /api/projects                # Create project
GET    /api/projects/[id]           # Get project details
PATCH  /api/projects/[id]           # Update project
POST   /api/projects/[id]/create-folders  # Create Drive folders
GET    /api/projects/[id]/milestones     # List milestones
POST   /api/projects/[id]/milestones     # Create milestone
```

#### AI Agents

```
GET    /api/agents/queue            # Get queue status
GET    /api/agents/logs/recent      # Recent agent executions
POST   /api/agents/run              # Manually trigger agent
```

#### Tasks

```
GET    /api/tasks                   # List tasks
POST   /api/tasks                   # Create task
PATCH  /api/tasks/[taskId]          # Update task
DELETE /api/tasks/[taskId]          # Delete task
```

#### Webhooks

```
POST   /api/webhooks/gmail          # Gmail Pub/Sub webhook
```

### Example: Fetch Emails

```typescript
const response = await fetch('/api/emails', {
  headers: {
    'Content-Type': 'application/json',
  },
});

const emails = await response.json();

// Response format
{
  emails: [
    {
      id: 'uuid',
      subject: 'Project kickoff meeting',
      from_email: 'client@example.com',
      from_name: 'John Doe',
      received_at: '2025-01-15T10:30:00Z',
      classification: {
        category: 'client_request',
        priority: 'high',
        sentiment: 'positive'
      }
    }
  ],
  total: 150,
  page: 1
}
```

---

## 🗄️ Database Schema

### Core Tables

- **`users`**: User accounts and preferences
- **`email_messages`**: Email storage with metadata
- **`email_classifications`**: AI classification results
- **`documents`**: Uploaded/processed documents
- **`projects`**: Client projects
- **`tasks`**: Action items extracted from emails
- **`scope_of_works`**: Generated SOW documents
- **`agent_logs`**: AI agent execution history
- **`email_sync_state`**: Gmail sync tracking

See `docs/00-database-schema.md` for complete schema documentation.

### Row Level Security (RLS)

All tables enforce row-level security:

```sql
-- Example: users can only access their own emails
CREATE POLICY "Users can view own emails"
ON email_messages FOR SELECT
USING (auth.uid() = user_id);
```

---

## 🔐 Security

- **OAuth 2.0**: Google authentication via NextAuth
- **Token Encryption**: Access/refresh tokens encrypted at rest
- **Row Level Security**: Database-level access control
- **API Rate Limiting**: Prevents abuse
- **HTTPS Only**: All traffic encrypted
- **Environment Variables**: Secrets never committed to Git
- **Pub/Sub Verification**: Webhook signatures validated

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/lib/ai/classifier.test.ts
```

---

## 📦 Deployment

### Deploy to Vercel

1. **Connect GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy**: `git push origin master`

### Environment Variables in Vercel

Add all variables from `.env.local.example` to:
- Vercel Dashboard → Project → Settings → Environment Variables
- Set for: Production, Preview, Development

### Worker Deployment

For production, deploy workers separately:

```bash
# Option 1: Vercel Cron Jobs (for lightweight tasks)
# Add to vercel.json
{
  "crons": [{
    "path": "/api/cron/process-queue",
    "schedule": "*/5 * * * *"
  }]
}

# Option 2: Separate worker process (recommended)
# Deploy to Railway, Render, or Fly.io
npm run workers
```

---

## 🛠️ Development

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Enforce code quality
- **Prettier**: Auto-formatting (on save)

```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Debug Mode

Enable verbose logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Queue Monitoring

View queue stats:

```bash
curl http://localhost:3000/api/queues/stats
```

Response:
```json
{
  "emailQueue": {
    "waiting": 5,
    "active": 2,
    "completed": 1234,
    "failed": 3
  }
}
```

---

## 🤝 Contributing

We welcome contributions! Here's how to add features:

### Adding a New Feature

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Implement**:
   - Add API route in `src/app/api/`
   - Add business logic in `src/lib/`
   - Add UI component in `src/components/`
   - Update types in `src/types/`
3. **Test**: Add tests for new functionality
4. **Document**: Update relevant docs
5. **Submit PR**: Push and create pull request

### For AI Agents Building Features

This codebase is designed for AI-assisted development:

- **Clear structure**: Features organized by domain
- **Type-safe**: TypeScript throughout
- **Documented**: Inline comments and JSDoc
- **Modular**: Easy to extend without breaking existing code
- **Examples**: Look at existing agents/routes as templates

**Tips**:
- Read `docs/00-architecture.md` to understand system design
- Check `src/lib/ai/agents/` for agent implementation patterns
- API routes follow Next.js App Router conventions
- Database queries use Supabase client (not an ORM)
- Queue jobs are defined in `src/lib/queue/workers.ts`

---

## 📚 Documentation

- [System Overview](docs/00-overview.md) - High-level goals and features
- [Architecture](docs/00-architecture.md) - Technical design and data flow
- [Database Schema](docs/00-database-schema.md) - Complete database documentation
- [API Specs](docs/00-api-specs.md) - Detailed API documentation
- [Setup Guide](docs/SETUP_INSTRUCTIONS.md) - Step-by-step infrastructure setup

---

## 🐛 Troubleshooting

### Common Issues

**"Database connection failed"**
- Check `DATABASE_URL` in `.env.local`
- Verify Supabase project is active
- Ensure IP allowlist includes your IP (if enabled)

**"Gmail API quota exceeded"**
- Gmail API has rate limits (250 quota units/user/second)
- Implement backoff/retry logic
- Check quota in Google Cloud Console

**"Queue jobs not processing"**
- Ensure Redis is running (`REDIS_URL` correct)
- Check workers are running (`npm run workers`)
- View queue stats: `GET /api/queues/stats`

**"Pub/Sub webhook not receiving notifications"**
- Verify webhook URL is publicly accessible
- Check Pub/Sub subscription is configured correctly
- Ensure Gmail watch is active (renew every 7 days)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Anthropic** - Claude AI for classification and generation
- **Vercel** - Hosting and serverless functions
- **Supabase** - PostgreSQL database with RLS
- **Upstash** - Serverless Redis for queues
- **Google Cloud** - Gmail, Drive, Docs, Sheets APIs

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/executive-assistant-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/executive-assistant-ai/discussions)
- **Email**: support@yourcompany.com

---

## 🗺️ Roadmap

- [ ] Team collaboration features
- [ ] Slack integration
- [ ] Mobile app (React Native)
- [ ] Voice commands
- [ ] Advanced analytics dashboard
- [ ] Custom agent builder (no-code)
- [ ] Multi-language support

---

**Built with ❤️ by developers, for professionals who want their time back.**
