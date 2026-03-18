import type {
  CreateSubscriberRequest,
  UpdateSubscriberRequest,
  SubscriberResponse,
  ListSubscribersParams,
  RegisterPushTokenRequest,
  PushTokenResponse,
  PreferencesResponse,
  RequestOptions,
} from "../types";
import {
  SubscriberResponseSchema,
  PushTokenResponseSchema,
  toSubscriberResponse,
  toPushTokenResponse,
} from "../types";

type RequestFn = <T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  options?: RequestOptions,
  parseResponse?: (raw: unknown) => T,
) => Promise<T>;

export class SubscribersResource {
  constructor(private request: RequestFn) {}

  async create(params: CreateSubscriberRequest): Promise<SubscriberResponse> {
    return this.request(
      "POST",
      "/subscribers",
      params as unknown as Record<string, unknown>,
      undefined,
      (raw) => toSubscriberResponse(SubscriberResponseSchema.parse(raw)),
    );
  }

  async list(params?: ListSubscribersParams): Promise<SubscriberResponse[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    const path = qs ? `/subscribers?${qs}` : "/subscribers";
    return this.request("GET", path, undefined, undefined, (raw) => {
      const arr = Array.isArray(raw) ? raw : [];
      return arr.map((r: unknown) => toSubscriberResponse(SubscriberResponseSchema.parse(r)));
    });
  }

  async get(subscriberId: string): Promise<SubscriberResponse> {
    return this.request(
      "GET",
      `/subscribers/${encodeURIComponent(subscriberId)}`,
      undefined,
      undefined,
      (raw) => toSubscriberResponse(SubscriberResponseSchema.parse(raw)),
    );
  }

  async update(subscriberId: string, params: UpdateSubscriberRequest): Promise<SubscriberResponse> {
    return this.request(
      "PATCH",
      `/subscribers/${encodeURIComponent(subscriberId)}`,
      params as unknown as Record<string, unknown>,
      undefined,
      (raw) => toSubscriberResponse(SubscriberResponseSchema.parse(raw)),
    );
  }

  async delete(subscriberId: string): Promise<void> {
    return this.request("DELETE", `/subscribers/${encodeURIComponent(subscriberId)}`);
  }

  async getPreferences(subscriberId: string): Promise<PreferencesResponse> {
    return this.request("GET", `/subscribers/${encodeURIComponent(subscriberId)}/preferences`);
  }

  async updatePreferences(subscriberId: string, params: Record<string, unknown>): Promise<PreferencesResponse> {
    return this.request("PATCH", `/subscribers/${encodeURIComponent(subscriberId)}/preferences`, params);
  }

  async registerPushToken(subscriberId: string, params: RegisterPushTokenRequest): Promise<PushTokenResponse[]> {
    return this.request(
      "POST",
      `/subscribers/${encodeURIComponent(subscriberId)}/push-tokens`,
      params as unknown as Record<string, unknown>,
      undefined,
      (raw) => {
        const arr = Array.isArray(raw) ? raw : [];
        return arr.map((r: unknown) => toPushTokenResponse(PushTokenResponseSchema.parse(r)));
      },
    );
  }

  async listPushTokens(subscriberId: string): Promise<PushTokenResponse[]> {
    return this.request(
      "GET",
      `/subscribers/${encodeURIComponent(subscriberId)}/push-tokens`,
      undefined,
      undefined,
      (raw) => {
        const arr = Array.isArray(raw) ? raw : [];
        return arr.map((r: unknown) => toPushTokenResponse(PushTokenResponseSchema.parse(r)));
      },
    );
  }

  async removePushToken(subscriberId: string, token: string): Promise<PushTokenResponse[]> {
    return this.request(
      "DELETE",
      `/subscribers/${encodeURIComponent(subscriberId)}/push-tokens/${encodeURIComponent(token)}`,
      undefined,
      undefined,
      (raw) => {
        const arr = Array.isArray(raw) ? raw : [];
        return arr.map((r: unknown) => toPushTokenResponse(PushTokenResponseSchema.parse(r)));
      },
    );
  }
}
