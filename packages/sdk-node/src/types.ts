import { z } from "zod";

// --- Channel Type ---

export type Channel =
  | "in_app"
  | "email"
  | "slack"
  | "whatsapp"
  | "discord"
  | "telegram"
  | "sms"
  | "push_android"
  | "push_ios"
  | "push_web";

// --- Request Types ---

export interface SubscriberInline {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  data?: Record<string, unknown>;
}

export interface EmailOverrides {
  to?: string;
  subject?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface SlackOverrides {
  channelId?: string;
  threadTs?: string;
}

export interface InAppOverrides {
  actionUrl?: string;
}

export interface ChannelOverrides {
  email?: EmailOverrides;
  slack?: SlackOverrides;
  inApp?: InAppOverrides;
}

export interface TriggerEventRequest {
  workflow: string;
  subscriberId?: string;
  subscriber?: SubscriberInline;
  payload?: Record<string, unknown>;
  channels?: Channel[];
  overrides?: ChannelOverrides;
  deliverAt?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface TriggerBulkRequest {
  workflow: string;
  subscribers: SubscriberInline[];
  payload?: Record<string, unknown>;
  channels?: Channel[];
  overrides?: ChannelOverrides;
  deliverAt?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface CreateSubscriberRequest {
  externalId: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
  slackUserId?: string;
  discordWebhookUrl?: string;
  telegramChatId?: string;
  customProperties?: Record<string, unknown>;
  channelPreferences?: Record<string, unknown>;
}

export interface UpdateSubscriberRequest {
  email?: string;
  name?: string;
  phoneNumber?: string;
  slackUserId?: string;
  discordWebhookUrl?: string;
  telegramChatId?: string;
  customProperties?: Record<string, unknown>;
  channelPreferences?: Record<string, unknown>;
}

export interface RegisterPushTokenRequest {
  token: string;
  platform: "android" | "ios" | "web";
  deviceId?: string;
}

export interface ListSubscribersParams {
  limit?: number;
  offset?: number;
}

// --- Response Types ---

export interface TriggerEventResponse {
  eventId: string;
  status: string;
  channelsRequested?: string[];
  channelsMatched?: string[];
  warnings: string[];
  scheduledAt?: string;
}

export interface SubscriberTriggerStatus {
  subscriberId: string;
  eventId?: string;
  status: string;
  error?: string;
}

export interface TriggerBulkResponse {
  batchId: string;
  status: string;
  total: number;
  accepted: number;
  duplicates: number;
  errors: number;
  results: SubscriberTriggerStatus[];
}

export interface SubscriberResponse {
  id: string;
  externalId: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
  slackUserId?: string;
  discordWebhookUrl?: string;
  telegramChatId?: string;
  pushTokens: PushTokenResponse[];
  customProperties: Record<string, unknown>;
  channelPreferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PushTokenResponse {
  token: string;
  platform: string;
  deviceId?: string;
  lastSeen?: string;
}

export interface SubscriberListResponse {
  subscribers: SubscriberResponse[];
  total: number;
}

export interface PreferencesResponse {
  global?: Record<string, boolean>;
  categories?: Record<string, Record<string, boolean>>;
  dnd?: { timezone: string; start: string; end: string };
  frequency?: { maxPerDay?: number; maxPerHour?: number };
}

// --- Client Config ---

export interface AlrtConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

// --- Internal: request options ---

export interface RequestOptions {
  idempotencyKey?: string;
}

// --- Zod Schemas (internal validation) ---

export const TriggerEventResponseSchema = z.object({
  event_id: z.string(),
  status: z.string(),
  channels_requested: z.array(z.string()).optional().nullable(),
  channels_matched: z.array(z.string()).optional().nullable(),
  warnings: z.array(z.string()).default([]),
  scheduled_at: z.string().optional().nullable(),
});

export const TriggerBulkResponseSchema = z.object({
  batch_id: z.string(),
  status: z.string(),
  total: z.number(),
  accepted: z.number(),
  duplicates: z.number(),
  errors: z.number(),
  results: z.array(z.object({
    subscriber_id: z.string(),
    event_id: z.string().optional().nullable(),
    status: z.string(),
    error: z.string().optional().nullable(),
  })),
});

export const SubscriberResponseSchema = z.object({
  id: z.string(),
  external_id: z.string(),
  email: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  slack_user_id: z.string().optional().nullable(),
  discord_webhook_url: z.string().optional().nullable(),
  telegram_chat_id: z.string().optional().nullable(),
  push_tokens: z.array(z.object({
    token: z.string(),
    platform: z.string(),
    device_id: z.string().optional().nullable(),
    last_seen: z.string().optional().nullable(),
  })).default([]),
  custom_properties: z.record(z.unknown()).default({}),
  channel_preferences: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PushTokenResponseSchema = z.object({
  token: z.string(),
  platform: z.string(),
  device_id: z.string().optional().nullable(),
  last_seen: z.string().optional().nullable(),
});

// --- Helpers: snake_case API response → camelCase SDK response ---

export function toTriggerResponse(raw: z.infer<typeof TriggerEventResponseSchema>): TriggerEventResponse {
  return {
    eventId: raw.event_id,
    status: raw.status,
    channelsRequested: raw.channels_requested ?? undefined,
    channelsMatched: raw.channels_matched ?? undefined,
    warnings: raw.warnings,
    scheduledAt: raw.scheduled_at ?? undefined,
  };
}

export function toBulkResponse(raw: z.infer<typeof TriggerBulkResponseSchema>): TriggerBulkResponse {
  return {
    batchId: raw.batch_id,
    status: raw.status,
    total: raw.total,
    accepted: raw.accepted,
    duplicates: raw.duplicates,
    errors: raw.errors,
    results: raw.results.map((r) => ({
      subscriberId: r.subscriber_id,
      eventId: r.event_id ?? undefined,
      status: r.status,
      error: r.error ?? undefined,
    })),
  };
}

export function toSubscriberResponse(raw: z.infer<typeof SubscriberResponseSchema>): SubscriberResponse {
  return {
    id: raw.id,
    externalId: raw.external_id,
    email: raw.email ?? undefined,
    name: raw.name ?? undefined,
    phoneNumber: raw.phone_number ?? undefined,
    slackUserId: raw.slack_user_id ?? undefined,
    discordWebhookUrl: raw.discord_webhook_url ?? undefined,
    telegramChatId: raw.telegram_chat_id ?? undefined,
    pushTokens: (raw.push_tokens || []).map((t) => ({
      token: t.token,
      platform: t.platform,
      deviceId: t.device_id ?? undefined,
      lastSeen: t.last_seen ?? undefined,
    })),
    customProperties: raw.custom_properties,
    channelPreferences: raw.channel_preferences,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function toPushTokenResponse(raw: z.infer<typeof PushTokenResponseSchema>): PushTokenResponse {
  return {
    token: raw.token,
    platform: raw.platform,
    deviceId: raw.device_id ?? undefined,
    lastSeen: raw.last_seen ?? undefined,
  };
}

// --- Helper: camelCase SDK request → snake_case API request ---

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function toSnakeCaseBody(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snakeKey = toSnakeCase(key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[snakeKey] = toSnakeCaseBody(value as Record<string, unknown>);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}
