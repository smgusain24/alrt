import type { AlrtConfig, RequestOptions } from "./types";
import { toSnakeCaseBody } from "./types";
import { throwForStatus } from "./errors";
import { isRetryable, getRetryDelay, sleep } from "./retry";
import { EventsResource } from "./resources/events";
import { SubscribersResource } from "./resources/subscribers";

const DEFAULT_BASE_URL = "https://api.alrt.dev";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30000;

export class Alrt {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;

  public readonly events: EventsResource;
  public readonly subscribers: SubscribersResource;

  constructor(config: AlrtConfig) {
    if (!config.apiKey) {
      throw new Error("apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;

    this.events = new EventsResource(this._request.bind(this));
    this.subscribers = new SubscribersResource(this._request.bind(this));
  }

  async _request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    options?: RequestOptions,
    parseResponse?: (raw: unknown) => T,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const snakeBody = body ? toSnakeCaseBody(body) : undefined;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: snakeBody ? JSON.stringify(snakeBody) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          const json = await response.json();
          return parseResponse ? parseResponse(json) : (json as T);
        }

        const responseBody = await response.text();

        if (isRetryable(response.status) && attempt < this.maxRetries) {
          const retryAfter = response.headers.get("retry-after");
          const delay = getRetryDelay(attempt, retryAfter);
          await sleep(delay);
          continue;
        }

        const retryAfter = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
        throwForStatus(response.status, responseBody, retryAfterSeconds);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`Request timed out after ${this.timeout}ms`);
          if (attempt < this.maxRetries) {
            const delay = getRetryDelay(attempt, null);
            await sleep(delay);
            continue;
          }
        }
        throw error;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }
}
