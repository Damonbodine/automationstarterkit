// Standalone worker process entrypoint
// Imports and keeps BullMQ workers alive outside of Next.js

import '../src/lib/queue/workers';

console.log('[workers] Workers initialized. Waiting for jobs...');

// Keep process alive
process.stdin.resume();

const shutdown = async () => {
  console.log('[workers] Shutdown signal received.');
  // workers.ts already registers SIGTERM/SIGINT handlers to close workers
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

