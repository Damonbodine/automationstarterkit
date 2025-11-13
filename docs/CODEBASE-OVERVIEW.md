> Note: This document is superseded by `docs/overview.md` (single-source). Keep this file for historical reference.

**Purpose**: Fast orientation for new contributors and agents. Explains structure, key modules, and primary flows.

**Top-Level**
- `src/app`: Next.js App Router pages, API routes, and assets.
- `src/components`: UI components (emails, projects, tasks, UI primitives).
- `src/lib`: Core application logic (DB, auth, AI, Gmail, Google Workspace, OCR, queues, orchestration, utils).
- `src/types`: TypeScript types including Supabase typed schema.
- `scripts`: Operational scripts (start background workers).
- `infrastructure`: Helper scripts for Supabase/GCP setup and an OCR demo service.
- `docs`: Product and technical docs (this file), plus diagrams.

**Primary Flows**
- Email ingestion → classification → agent actions
  - Ingestion: `src/lib/email/email-sync.ts` using `GmailClient`.
  - Classification: `src/lib/ai/classifier.ts` via Claude with pattern pre-check.
  - Agents: `src/lib/ai/agents/*` executed via BullMQ workers.
  - OCR: `src/lib/ocr/pdf-ocr.ts` with Cloud Vision + GCS.
  - Persistence: Supabase via `src/lib/db/client.ts`.

**Queues and Workers**
- Queues: `src/lib/queue/queues.ts`
  - `email-sync`, `email-classification`, `ai-agents`, `document-ocr`, `dead-letter`.
- Workers: `src/lib/queue/workers.ts`
  - Email sync, classification, AI agents, document OCR, dead-letter consumer.
- Scheduler: `src/lib/queue/auto-sync-scheduler.ts`
  - Repeatable jobs for polling syncs and Gmail watch renewals.
- Redis client: `src/lib/queue/redis-client.ts`.
- Entrypoint: `scripts/start-workers.ts` (run in a separate process).

**Google Integrations**
- Gmail wrapper: `src/lib/gmail/gmail-client.ts` (rate limiting, pagination, attachments, history, watch).
- Pub/Sub verification: `src/lib/google/pubsub-verify.ts`.
- Retry helper: `src/lib/google/retry.ts`.
- Docs/Sheets/Drive/Calendar clients: `src/lib/google/*-client.ts`.

**Auth**
- NextAuth Google OAuth: `src/lib/auth/auth-options.ts`.
- Token encryption: `src/lib/encryption/token-encryption.ts`.

**Database (Supabase)**
- Typed schema: `src/types/database.ts` (tables include `email_messages`, `email_classifications`, `documents`, `tasks`, `projects`, `scope_of_works`, `email_sync_state`, `user_sync_preferences`, `gmail_watch_subscriptions`, `agent_logs`, `users`).
- Access: `src/lib/db/client.ts` (client, server, session-bound client).

**Orchestration Hooks**
- Extension points for custom automation: `src/lib/orchestration/hooks.ts`.

**Key API Routes (Serverless)**
- Gmail webhook: `src/app/api/webhooks/gmail/route.ts`.
- Email sync trigger + status: `src/app/api/emails/sync/route.ts`.
- Email CRUD/classification/attachments/ocr: `src/app/api/emails/*`.
- Agents enqueue + logs: `src/app/api/agents/*`.
- Projects, tasks, documents, health, queue stats: `src/app/api/**`.

**UI Highlights**
- Email screens: `src/app/emails/*` and `src/components/email/*`.
- Dashboard: `src/app/dashboard/*` and `src/components/dashboard/*`.
- Agents UI: `src/app/agents/*` and `src/components/agents/*`.
- Providers: `src/components/providers/QueryProvider.tsx`.

**How Things Fit Together**
- See `docs/diagrams/architecture.mmd` and `docs/diagrams/email-processing-sequence.mmd`.

**Common Modification Tasks**
- Add a new agent
  - Define job shape in `queues.ts` if needed.
  - Implement agent in `src/lib/ai/agents/<agent>.ts`.
  - Handle in `aiAgentsWorker` switch.
  - Expose enqueue API in `src/app/api/agents/queue/route.ts`.
  - Add UI trigger if needed.
- Add an API route
  - Create under `src/app/api/<path>/route.ts`.
  - Use `getServerSession(authOptions)` for auth.
  - Use server Supabase client for privileged writes.
- Extend DB schema
  - Update Supabase migrations, then sync `src/types/database.ts`.
  - Update lib code and API handlers accordingly.
