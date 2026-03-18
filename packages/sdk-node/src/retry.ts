const BASE_DELAY_MS = 500;
const JITTER_MAX_MS = 100;

export interface RetryConfig {
  maxRetries: number;
  timeout: number;
}

export function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export function getRetryDelay(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * JITTER_MAX_MS;
  return exponential + jitter;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
