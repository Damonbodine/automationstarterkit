Starter Pack: Small Business Automation

Goal: Provide a reusable, Google‑Workspace–centric foundation that ingests email, classifies intent, OCRs attachments, and orchestrates actions across Drive, Docs, Sheets, and Calendar. Each business plugs in a lightweight config and optional rules to tailor workflows.

Core Capabilities (already implemented)
- Auth + Identity: NextAuth (Google OAuth) + Supabase users.
- Email Ingest: Gmail sync via polling and Pub/Sub webhooks; incremental history sync; rate‑limited client.
- Storage + OCR: Attachments to GCS; Google Vision OCR for PDFs/images; document rows in Supabase.
- Queues + Workers: BullMQ queues for email sync, classification, and agents; autoscheduler for polling + watch renewal.
- Google Workspace Clients: Drive, Docs, Sheets, Calendar wrappers with per‑user OAuth.
- Templates: Template manager for Docs + Sheets, default templates, and custom user templates.
- Agents: Classification + SOW/Task/Document summarizer stubs with Anthropic client.

Recommended Starter-Pack Abstractions
- Client Config: Declarative YAML per business (branding, default folders, templates, sharing rules, routing labels, categories).
- Automation Rules: When→Then mappings triggered by email classifications or keywords (e.g., “invoice” → move to Finance, extract to Sheet, send ack).
- Orchestration Hooks: Event surface for post‑classification, post‑OCR, and project lifecycle events that invoke Google clients.
- Project Scaffolding: Drive folder structure + tracker Sheet created from templates per client config.

Integration Points (map your processes)
- Email: `email-sync.ts` saves emails, triggers `queueEmailClassification`. Hook here to branch by classification.
- Attachments: `processAttachments` persists files to GCS and OCRs. Hook here to copy/move into client‑specific Drive paths.
- Docs/Sheets: `TemplateManager` can create Docs/Sheets from templates. Use to generate proposals, trackers, intake forms.
- Projects: `folder-automation.ts` builds folder trees + trackers. Extend for industry‑specific structures.
- Calendar: `calendar-client.ts` to create meetings for bookings/leads.

Deployment Topology
- Next.js app (API routes + UI) + workers process (BullMQ) + Supabase (DB/RLS) + Google Cloud (Oauth, Pub/Sub, Storage, Vision).
- Webhook security: Pub/Sub OIDC verification via `pubsub-verify.ts` with `PUBSUB_AUDIENCE`.

Extending for a New Business
1) Create `templates/clients/<slug>.yaml` from the example.
2) Seed Drive folder structure and default Sheets/Docs using `TemplateManager` + `createProjectFolders`.
3) Define Automation Rules that react to classifications or subject patterns and call Google clients.
4) Optionally add UI toggles in `/settings` to enable webhooks (watch), polling, and interval.

Next Steps (implementation plan)
- Add a small rules engine: evaluate message metadata + classification → action list (Drive move, Sheet append, Doc create, Gmail reply).
- Add a loader to read `templates/clients/<slug>.yaml` and expose as `user_sync_preferences.custom_config`.
- Provide a simple “Getting Started Wizard” page to capture client slug and apply config.

