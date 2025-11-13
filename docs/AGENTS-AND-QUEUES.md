**Purpose**: Explain background processing, queues, and AI agents for quick onboarding.

**Queues** (see `src/lib/queue/queues.ts`)
- `email-sync`: Sync Gmail → `email_messages`, attachments → GCS/`documents`.
- `email-classification`: Classify emails (pattern + Claude) → `email_classifications`.
- `ai-agents`: Execute higher-level agents (SOW, task extraction, summarization).
- `document-ocr`: OCR PDFs/images via Vision; update `documents.ocr_text`.
- `dead-letter`: Fallback queue for failed jobs after retries.

**Workers** (see `src/lib/queue/workers.ts`)
- Email Sync Worker
  - Processes `EmailSyncJob { userId, fullSync? }`.
  - Uses `GmailClient` to ingest; queues classification per email.
- Email Classification Worker
  - Processes `EmailClassificationJob { emailId, userId }`.
  - Calls Claude via `createClaudeMessage`; saves result; enqueues agents per assignment.
- AI Agents Worker
  - Processes `AIAgentJob { type, emailId, userId, metadata? }`.
  - Types: `sow-generator`, `task-extractor`, `document-summarizer`.
  - Writes outputs to `scope_of_works`, `tasks`, `agent_logs`, etc.
- Document OCR Worker
  - Processes `DocumentOCRJob { documentId, userId, gcsUrl, mimeType }`.
  - For PDFs, runs batch Vision OCR via GCS; updates document; may enqueue summarizer.
- Dead Letter Worker
  - Logs failures for inspection and alerting.

**Scheduling** (see `src/lib/queue/auto-sync-scheduler.ts`)
- Repeatable jobs:
  - `check-polling` every 5 mins: respects `user_sync_preferences` to queue incremental syncs.
  - `renew-watches` hourly: refreshes expiring Gmail watches in `gmail_watch_subscriptions`.

**Operations**
- Start workers: `npm run workers` → `scripts/start-workers.ts`.
- Redis config: `REDIS_URL` required; Upstash recommended in production.
- Queue stats API: `src/app/api/queues/stats/route.ts`.

**Adding a New Agent**
- Add handler in `aiAgentsWorker` switch.
- Implement in `src/lib/ai/agents/<name>.ts`.
- Enqueue via API (`/api/agents/queue`) or internally after classification.
- Persist outcomes and log to `agent_logs`.

**Diagrams**
- Architecture: `docs/diagrams/architecture.mmd`
- Email flow: `docs/diagrams/email-processing-sequence.mmd`

