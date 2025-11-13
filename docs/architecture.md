# Architecture

This is the canonical architecture document. For historical version, see `docs/00-architecture.md`.

## Diagrams

- Architecture: `./diagrams/architecture.svg`
- Email processing: `./diagrams/email-processing-sequence.svg`
- Sources (Mermaid): `./diagrams/*.mmd`

## Summary

- Next.js App Router for UI and API routes
- Supabase (Postgres with RLS) as data store
- BullMQ + Redis for background jobs
- Gmail/Drive/Docs/Sheets/Calendar APIs for integrations
- Cloud Storage + Vision OCR for attachments/PDFs
- Claude for classification and agent reasoning

See details in the source files: `src/lib/**` and `src/app/api/**`.

## Tech Stack

- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4
- Language: TypeScript 5
- Auth: NextAuth.js (Google OAuth)
- Database: Supabase (PostgreSQL + RLS)
- AI: Anthropic Claude (model configurable via env)
- Queue: BullMQ on Redis (Upstash in production)
- Integrations: Google APIs (Gmail, Drive, Docs, Sheets, Calendar)
- Storage/OCR: Google Cloud Storage + Vision
- Deployment: Vercel (frontend + API routes)

## Infrastructure Overview

- Frontend/API: Vercel serverless functions for routes under `src/app/api/**`
- Workers: Separate Node process (`npm run workers`) runs BullMQ workers
- Redis: Single instance for queues (Upstash recommended)
- Pub/Sub: Gmail push notifications → `/api/webhooks/gmail`
- Storage: GCS bucket for attachments and OCR outputs

## Environment Variables (essentials)

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_APPLICATION_CREDENTIALS_BASE64`, `GCS_BUCKET_NAME`
- Pub/Sub: `PUBSUB_TOPIC`, `PUBSUB_SUBSCRIPTION`, optional `PUBSUB_VERIFY`, `PUBSUB_AUDIENCE`
- Anthropic: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_FALLBACK_MODEL`
- Redis: `REDIS_URL`
- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- App: `ENCRYPTION_KEY`, `GMAIL_API_RATE_LIMIT`

## Deployment Process

1. Push to main → Vercel builds and deploys
2. Apply DB migrations (Supabase SQL or migration pipeline)
3. Ensure env vars set in Vercel
4. Start/ensure workers running with `REDIS_URL`
5. Update Pub/Sub push endpoint to deployed `/api/webhooks/gmail`

## Observability

- Track: API latency, error rates, queue depth, worker failures, email processing latency
- Optional: Sentry projects (frontend, API, workers)
- Health endpoints: `/api/health/integrations`, `/api/queues/stats`
