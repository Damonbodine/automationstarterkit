# Operations

## Setup

- Supabase
  - Create project, collect: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooled)
  - Apply migrations (SQL editor or migration scripts)
  - Verify tables and RLS policies
- Google Cloud
  - Enable APIs: Gmail, Drive, Docs, Sheets, Calendar, Pub/Sub, Storage, Vision
  - OAuth client (web): set redirect URIs for local/prod
  - Service Account: roles for Storage, Vision, Pub/Sub; export JSON → base64 → `GOOGLE_APPLICATION_CREDENTIALS_BASE64`
  - GCS bucket: `GCS_BUCKET_NAME` (uniform access, versioning optional)
  - Pub/Sub: topic `gmail-notifications`, push subscription → `/api/webhooks/gmail`
- Redis: provision (Upstash), set `REDIS_URL`
- Anthropic: `ANTHROPIC_API_KEY` (+ optional model envs)
- Vercel: import repo, set env, deploy

See `.env.local.example` for a complete variable list.

## Deployment

- Vercel for frontend/API routes.
- Background workers via `npm run workers` (BullMQ). Ensure `REDIS_URL` configured.

## Monitoring

- Queue depth, processing rate, failure counts.
- API latency and error rates.
- Optional: Sentry projects for frontend, API, workers.

## Runbooks

- Start workers: `npm run workers`
- Check queue stats: `/api/queues/stats`
- Trigger email sync: POST `/api/emails/sync`
- Verify Gmail webhook: GET `/api/webhooks/gmail`

## Credentials Checklist

- Supabase keys (anon + service), pooled `DATABASE_URL`
- Google OAuth client + service account base64
- Redis `REDIS_URL`
- Anthropic `ANTHROPIC_API_KEY`
- NextAuth `NEXTAUTH_SECRET`
