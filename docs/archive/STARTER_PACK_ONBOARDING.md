Starter Pack Onboarding

Prereqs
- Google Cloud project with: Gmail, Drive, Docs, Sheets, Calendar, Pub/Sub, Storage, Vision enabled.
- OAuth Client (Web) with redirect `.../api/auth/callback/google` and required scopes.
- Supabase project; apply migrations in `/supabase/migrations`.
- Redis instance for BullMQ.

Env Vars (minimum)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY` (32‑byte hex), `NEXTAUTH_SECRET`.
- `GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`.
- `PUBSUB_TOPIC`, `PUBSUB_AUDIENCE`, `PUBSUB_VERIFY=true`.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (as needed).

Local Dev
- `npm run dev` starts Next.js; workers boot in‑process when `RUN_WORKERS_IN_PROCESS=1`.
- For prod, run workers separately: `npm run workers`.

Google Watch (Webhooks)
1) Create Pub/Sub topic and push subscription to `https://<domain>/api/webhooks/gmail`.
2) Set OIDC token audience to your webhook URL; set `PUBSUB_AUDIENCE` env.
3) In app Settings → Sync, enable Webhooks or call `POST /api/sync-settings/watch/start`.

Client Setup Flow
1) Create a client config from `templates/client-config.example.yaml` under `templates/clients/<slug>.yaml`.
2) Log in via Google; auto‑created user will have `email_sync_state` initialized.
3) Call `POST /api/emails/sync` for initial sync (or toggle auto‑sync in Settings).
4) Use Projects to scaffold Drive folders and Sheets; adjust templates as needed.

Mapping Business Processes
- Start with Email categories: define labels/keywords in client config.
- Pilot one or two Automations: e.g., “Invoices” → append to Finance Sheet + Drive move + ack email.
- Validate outcomes in Dashboard and Documents views.

