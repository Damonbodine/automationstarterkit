# Development

## Local Dev

- Node 22+, `npm install`, `npm run dev`.
- Environment variables: copy `.env.local.example` → `.env.local`.
- Workers: `npm run workers`.

## Patterns

- Use Supabase server client for privileged ops; client for RLS-aware calls.
- Queue jobs through `src/lib/queue/queues.ts`.
- Implement agents in `src/lib/ai/agents/*` and switch in `aiAgentsWorker`.

## Testing

- API routes under `src/app/api/**`.
- Prefer unit tests for utilities and integration tests around queues.

## Contributing

- Follow TypeScript strictness, keep changes minimal and focused.
- Add/adjust docs near code when behavior changes.

## Handy Endpoints

- Trigger incremental sync: `POST /api/emails/sync`
- Get sync state: `GET /api/emails/sync`
- Enqueue agent: `POST /api/agents/queue`
- Queue stats: `GET /api/queues/stats?queue=email-sync`
