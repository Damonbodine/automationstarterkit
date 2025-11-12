type AsyncFn<T> = () => Promise<T>;

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

export async function withGoogleRetry<T>(fn: AsyncFn<T>, opts?: { retries?: number; baseMs?: number }): Promise<T> {
  const retries = opts?.retries ?? 4;
  const baseMs = opts?.baseMs ?? 250;
  let attempt = 0;
  let lastErr: any;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = (err?.code || err?.status || err?.response?.status) as number | undefined;
      if (status && !RETRY_STATUS.has(status)) throw err;
      const delay = Math.min(baseMs * 2 ** attempt, 4000) + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}

