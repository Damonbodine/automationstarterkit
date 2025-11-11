EmailAI (OCR App)

- Dev: `npm run dev` (workers boot in-process)
- Build: `npm run build`

Notes
- Workers run in-process via `RUN_WORKERS_IN_PROCESS=1` during development. For production, deploy a separate worker process.
- Queue stats are available at `GET /api/queues/stats`.

