import "server-only";

export class ProviderHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const BACKOFF_MS = [1000, 3000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** §12.1 — 20 s timeout per attempt; retries 429/5xx with 1 s then 3 s backoff. */
export async function fetchWithRetry(url: string, init: RequestInit, timeoutMs = 20_000): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= BACKOFF_MS.length) {
      const body = await res.text().catch(() => "");
      throw new ProviderHttpError(res.status, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    await sleep(BACKOFF_MS[attempt]);
  }
}

/**
 * Calls `ask` and validates its JSON reply; on a parse/validation failure asks once
 * more with a nudge (§FR-2.8) before giving up.
 */
export async function askJson<T>(ask: (isRetry: boolean) => Promise<string>, parse: (text: string) => T): Promise<T> {
  const first = await ask(false);
  try {
    return parse(first);
  } catch {
    return parse(await ask(true));
  }
}
