// Boot BullMQ workers in-process for local dev if enabled
export function bootWorkersInProcess() {
  if (process.env.RUN_WORKERS_IN_PROCESS !== '1') return;
  const g = globalThis as any;
  if (g.__workersBootstrapped) return;
  g.__workersBootstrapped = true;
  // Dynamic import to avoid bundling in edge/client
  import('@/lib/queue/workers')
    .then(async () => {
      console.log('[workers] Bootstrapped in-process at server start');

      // Initialize the automatic sync scheduler
      const { initializeAutoSyncScheduler } = await import('@/lib/queue/auto-sync-scheduler');
      await initializeAutoSyncScheduler();
    })
    .catch((err) => {
      console.error('[workers] Failed to bootstrap in-process workers:', err);
      g.__workersBootstrapped = false;
    });
}

