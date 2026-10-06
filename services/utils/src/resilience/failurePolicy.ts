export type FailureClass = "retryable" | "permanent";

export interface RetryOptions {
  baseMs: number;
  maxMs: number;
  jitterRatio?: number;
  random?: () => number;
}

export function classifyFailure(error: unknown): FailureClass {
  const value = error as { code?: string; response?: { status?: number } } | null;
  const status = value?.response?.status;
  if (typeof status === "number") {
    return status === 408 || status === 425 || status === 429 || status >= 500 ? "retryable" : "permanent";
  }

  return value?.code && ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH"].includes(value.code)
    ? "retryable"
    : "permanent";
}

export function retryDelayMs(attempt: number, options: RetryOptions): number {
  const exponent = Math.max(0, Math.floor(attempt));
  const base = Math.min(options.maxMs, options.baseMs * (2 ** exponent));
  const jitterRatio = options.jitterRatio ?? 0;
  if (jitterRatio <= 0) return Math.round(base);
  const random = Math.min(1, Math.max(0, options.random?.() ?? Math.random()));
  const multiplier = 1 - jitterRatio + (2 * jitterRatio * random);
  return Math.round(Math.min(options.maxMs, base * multiplier));
}

export function shouldRetry(attempt: number, maxAttempts: number, failureClass: FailureClass): boolean {
  return failureClass === "retryable" && attempt < maxAttempts;
}

export function createEventDeduplicator(options: { ttlMs: number; now?: () => number }) {
  const seen = new Map<string, number>();
  const now = options.now ?? Date.now;

  const purge = () => {
    const cutoff = now() - options.ttlMs;
    for (const [id, timestamp] of seen) if (timestamp <= cutoff) seen.delete(id);
  };

  return {
    accept(eventId: string): boolean {
      purge();
      if (!eventId || seen.has(eventId)) return false;
      seen.set(eventId, now());
      return true;
    },
  };
}

export function createCircuitBreaker(options: {
  failureThreshold: number;
  cooldownMs: number;
  now?: () => number;
}) {
  let failures = 0;
  let openedAt: number | null = null;
  const now = options.now ?? Date.now;

  return {
    allow(): boolean {
      if (openedAt === null) return true;
      if (now() - openedAt >= options.cooldownMs) {
        openedAt = null;
        failures = 0;
        return true;
      }
      return false;
    },
    recordFailure(): void {
      failures += 1;
      if (failures >= options.failureThreshold) openedAt = now();
    },
    recordSuccess(): void {
      failures = 0;
      openedAt = null;
    },
  };
}
