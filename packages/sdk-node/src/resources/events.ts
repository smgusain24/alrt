import type {
  TriggerEventRequest,
  TriggerEventResponse,
  TriggerBulkRequest,
  TriggerBulkResponse,
  RequestOptions,
} from "../types";
import {
  TriggerEventResponseSchema,
  TriggerBulkResponseSchema,
  toTriggerResponse,
  toBulkResponse,
} from "../types";

type RequestFn = <T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  options?: RequestOptions,
  parseResponse?: (raw: unknown) => T,
) => Promise<T>;

export class EventsResource {
  constructor(private request: RequestFn) {}

  async trigger(params: TriggerEventRequest): Promise<TriggerEventResponse> {
    const { idempotencyKey, ...body } = params;
    return this.request(
      "POST",
      "/events/trigger",
      body as Record<string, unknown>,
      idempotencyKey ? { idempotencyKey } : undefined,
      (raw) => toTriggerResponse(TriggerEventResponseSchema.parse(raw)),
    );
  }

  async triggerBulk(params: TriggerBulkRequest): Promise<TriggerBulkResponse> {
    const { idempotencyKey, ...body } = params;
    return this.request(
      "POST",
      "/events/trigger-bulk",
      body as Record<string, unknown>,
      idempotencyKey ? { idempotencyKey } : undefined,
      (raw) => toBulkResponse(TriggerBulkResponseSchema.parse(raw)),
    );
  }
}
