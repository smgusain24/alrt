"use client";

import {
  DocsSidebar,
  SDKMethodBlock,
  SDKCodePane,
  SDKParamsTable,
  LanguageToggle,
  InstallHeader,
  SearchDialog,
  LanguageProvider,
  useLanguage,
} from "@/components/docs";
import type { SearchItem } from "@/components/docs";
import Link from "next/link";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NAVIGATION STRUCTURE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SECTIONS = [
  {
    id: "getting-started",
    label: "Getting Started",
    children: [
      { id: "installation", label: "Installation" },
      { id: "initialization", label: "Initialization" },
    ],
  },
  {
    id: "authentication",
    label: "Authentication",
  },
  {
    id: "events",
    label: "Events",
    children: [
      { id: "events-trigger", label: ".trigger()" },
      { id: "events-trigger-bulk", label: ".triggerBulk()" },
    ],
  },
  {
    id: "subscribers",
    label: "Subscribers",
    children: [
      { id: "subscribers-create", label: ".create()" },
      { id: "subscribers-get", label: ".get()" },
      { id: "subscribers-list", label: ".list()" },
      { id: "subscribers-update", label: ".update()" },
      { id: "subscribers-delete", label: ".delete()" },
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    children: [
      { id: "preferences-get", label: ".getPreferences()" },
      { id: "preferences-update", label: ".updatePreferences()" },
    ],
  },
  {
    id: "push-tokens",
    label: "Push Tokens",
    children: [
      { id: "push-register", label: ".registerPushToken()" },
      { id: "push-list", label: ".listPushTokens()" },
      { id: "push-remove", label: ".removePushToken()" },
    ],
  },
  {
    id: "error-handling",
    label: "Error Handling",
  },
  {
    id: "websocket",
    label: "WebSocket",
  },
];

const SEARCH_ITEMS: SearchItem[] = [
  { id: "getting-started", label: "Getting Started", category: "Guide" },
  { id: "installation", label: "Installation", category: "Guide" },
  { id: "initialization", label: "Client Initialization", category: "Guide" },
  { id: "authentication", label: "Authentication", category: "Guide" },
  { id: "events-trigger", label: "Trigger Event", category: "Events", signature: "client.events.trigger()" },
  { id: "events-trigger-bulk", label: "Trigger Bulk", category: "Events", signature: "client.events.triggerBulk()" },
  { id: "subscribers-create", label: "Create Subscriber", category: "Subscribers", signature: "client.subscribers.create()" },
  { id: "subscribers-get", label: "Get Subscriber", category: "Subscribers", signature: "client.subscribers.get()" },
  { id: "subscribers-list", label: "List Subscribers", category: "Subscribers", signature: "client.subscribers.list()" },
  { id: "subscribers-update", label: "Update Subscriber", category: "Subscribers", signature: "client.subscribers.update()" },
  { id: "subscribers-delete", label: "Delete Subscriber", category: "Subscribers", signature: "client.subscribers.delete()" },
  { id: "preferences-get", label: "Get Preferences", category: "Preferences", signature: "client.subscribers.getPreferences()" },
  { id: "preferences-update", label: "Update Preferences", category: "Preferences", signature: "client.subscribers.updatePreferences()" },
  { id: "push-register", label: "Register Push Token", category: "Push", signature: "client.subscribers.registerPushToken()" },
  { id: "push-list", label: "List Push Tokens", category: "Push", signature: "client.subscribers.listPushTokens()" },
  { id: "push-remove", label: "Remove Push Token", category: "Push", signature: "client.subscribers.removePushToken()" },
  { id: "error-handling", label: "Error Handling", category: "Guide" },
  { id: "websocket", label: "WebSocket (In-App)", category: "Guide" },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAGE COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function DocsPage() {
  return (
    <LanguageProvider>
      <DocsContent />
    </LanguageProvider>
  );
}

function DocsContent() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      {/* ── Top bar ── */}
      <nav
        style={{
          background: "rgba(18,18,18,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-border)",
          padding: "10px 24px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif), Playfair Display, serif",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "var(--color-text-primary)",
                }}
              >
                ALRT
              </span>
            </Link>
            <span
              style={{
                width: "1px",
                height: "20px",
                background: "var(--color-border)",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              SDK Reference
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SearchDialog items={SEARCH_ITEMS} />
            <LanguageToggle />
          </div>
        </div>
      </nav>

      {/* ── 3-column layout ── */}
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: "calc(100vh - 52px)",
        }}
      >
        {/* Left sidebar */}
        <aside
          style={{
            borderRight: "1px solid var(--color-border)",
            position: "sticky",
            top: "52px",
            height: "calc(100vh - 52px)",
            overflowY: "auto",
          }}
        >
          <DocsSidebar sections={SECTIONS} />
        </aside>

        {/* Center + Right content */}
        <main style={{ padding: "40px 48px", maxWidth: "100%", overflow: "hidden" }}>
          <GettingStartedSection />
          <AuthenticationSection />
          <EventsSection />
          <SubscribersSection />
          <PreferencesSection />
          <PushTokensSection />
          <ErrorHandlingSection />
          <WebSocketSection />
        </main>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Getting Started
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GettingStartedSection() {
  return (
    <section id="getting-started" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Getting Started</SectionHeading>
      <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "24px", maxWidth: "640px" }}>
        Install the alrt SDK and start sending notifications in under 5 minutes.
        One API key, 6+ channels, zero external account setup.
      </p>

      {/* Installation */}
      <div id="installation" style={{ marginBottom: "32px", scrollMarginTop: "80px" }}>
        <SubHeading>Installation</SubHeading>
        <InstallHeader />
      </div>

      {/* Initialization */}
      <div id="initialization" style={{ scrollMarginTop: "80px" }}>
        <SubHeading>Initialize the Client</SubHeading>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "16px" }}>
          Create an alrt client instance with your server API key. Get your key from the{" "}
          <Link href="/settings" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
            Settings
          </Link>{" "}
          page in the dashboard.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
          <SDKParamsTable
            title="Constructor Options"
            params={[
              { name: "apiKey", nodeType: "string", pythonType: "str", required: true, description: "Your alrt server API key (alrt_sk_...)" },
              { name: "baseUrl", nodeType: "string", pythonType: "str", required: false, default: '"https://api.alrt.dev"', description: "Override the API base URL" },
              { name: "maxRetries", nodeType: "number", pythonType: "int", required: false, default: "3", description: "Max retry attempts for failed requests" },
              { name: "timeout", nodeType: "number", pythonType: "float", required: false, default: "30000", description: "Request timeout in ms (Node) / seconds (Python)" },
            ]}
          />
          <SDKCodePane
            node={`import { Alrt } from "@alrt/node";

const client = new Alrt({
  apiKey: process.env.ALRT_API_KEY,
});

// Send your first notification
const result = await client.events.trigger({
  workflow: "welcome",
  subscriberId: "user-123",
  payload: { name: "Alice" },
});

console.log(result.eventId);`}
            python={`from alrt import Alrt

client = Alrt(api_key="alrt_sk_...")

# Send your first notification
result = client.events.trigger(
    workflow="welcome",
    subscriber_id="user-123",
    payload={"name": "Alice"},
)

print(result.event_id)`}
            rest={`# Trigger a notification workflow
curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "welcome",
    "subscriber_id": "user-123",
    "payload": { "name": "Alice" }
  }'`}
          />
        </div>

        {/* Async Python variant */}
        <div style={{ marginTop: "20px" }}>
          <SDKCodePane
            node={`// Node.js is async by default — no additional setup needed.
// All methods return Promises.
const result = await client.events.trigger({ ... });`}
            python={`# For async Python (FastAPI, etc.), use AsyncAlrt:
from alrt import AsyncAlrt

async with AsyncAlrt(api_key="alrt_sk_...") as client:
    result = await client.events.trigger(
        workflow="welcome",
        subscriber_id="user-123",
    )`}
            rest={`# REST API is stateless — no async/sync distinction.
# Every request is independent.
curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"workflow": "welcome", "subscriber_id": "user-123"}'`}
            title="Async Usage"
          />
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Authentication
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function AuthenticationSection() {
  return (
    <section id="authentication" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Authentication</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "16px", maxWidth: "640px" }}>
        The SDK authenticates via your API key passed to the constructor. alrt supports two key types:
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        <div>
          <div
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            {[
              { prefix: "alrt_sk_", label: "Server Key", access: "Full read/write access. Use server-side only.", color: "var(--color-accent)" },
              { prefix: "alrt_ck_", label: "Client Key", access: "Read-only. Safe for browser/mobile use.", color: "var(--color-warning)" },
            ].map((key, i) => (
              <div
                key={key.prefix}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "12px",
                  padding: "12px 14px",
                  borderBottom: i === 0 ? "1px solid var(--color-border)" : undefined,
                }}
              >
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: key.color,
                    flexShrink: 0,
                  }}
                >
                  {key.prefix}...
                </code>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {key.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {key.access}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Keys are SHA-256 hashed before storage. The raw key is only shown once at creation time.
            Manage keys in the dashboard under Settings &rarr; API Keys.
          </p>
        </div>

        <SDKCodePane
          node={`// Server-side (Next.js API route, Express, etc.)
import { Alrt } from "@alrt/node";

const client = new Alrt({
  apiKey: process.env.ALRT_API_KEY,
  // key is sent as: Authorization: Bearer alrt_sk_...
});

// The SDK automatically includes the key
// in every request header. No manual setup needed.`}
          python={`# Server-side (FastAPI, Django, Flask)
from alrt import Alrt
import os

client = Alrt(api_key=os.environ["ALRT_API_KEY"])
# key is sent as: Authorization: Bearer alrt_sk_...

# The SDK automatically includes the key
# in every request header. No manual setup needed.`}
          rest={`# All REST requests include the API key as a Bearer token:
curl -X GET https://api.alrt.dev/subscribers \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json"

# Server keys (alrt_sk_) → full read/write access
# Client keys (alrt_ck_) → read-only access`}
        />
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Events
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function EventsSection() {
  return (
    <section id="events" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Events</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "640px" }}>
        Events are the primary way to trigger notification workflows. Each event maps to a workflow
        you&apos;ve built in the visual editor.
      </p>

      {/* trigger */}
      <SDKMethodBlock
        id="events-trigger"
        nodeSignature="client.events.trigger(params)"
        pythonSignature="client.events.trigger(**kwargs)"
        restSignature="POST /events/trigger"
        description="Trigger a notification workflow for a single subscriber. The workflow determines which channels to send on, applies templates, and executes any delay/condition nodes."
        returnType={{ node: "Promise<TriggerEventResponse>", python: "TriggerEventResponse", rest: "JSON object" }}
        params={[
          { name: "workflow", nodeType: "string", pythonType: "str", required: true, description: "The workflow name (must match a workflow in the dashboard)" },
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: false, description: "ID of an existing subscriber" },
          { name: "subscriber", nodeType: "SubscriberInline", pythonType: "dict", required: false, description: "Inline subscriber object — auto-creates if not found" },
          { name: "payload", nodeType: "Record<string, unknown>", pythonType: "dict", required: false, description: "Dynamic data merged into notification templates" },
          { name: "channels", nodeType: "Channel[]", pythonType: "list[str]", required: false, description: "Restrict delivery to specific channels" },
          { name: "overrides", nodeType: "ChannelOverrides", pythonType: "dict", required: false, description: "Per-channel overrides (email.to, slack.channelId, etc.)" },
          { name: "deliverAt", nodeType: "string", pythonType: "str", required: false, description: "ISO 8601 timestamp for scheduled delivery" },
          { name: "metadata", nodeType: "Record<string, unknown>", pythonType: "dict", required: false, description: "Arbitrary metadata stored with the event" },
          { name: "idempotencyKey", nodeType: "string", pythonType: "str", required: false, description: "Prevents duplicate processing of the same event" },
        ]}
        nodeExample={`const result = await client.events.trigger({
  workflow: "order.shipped",
  subscriberId: "user-456",
  payload: {
    orderId: "ORD-789",
    trackingUrl: "https://track.example.com/789",
  },
  channels: ["email", "in_app"],
  idempotencyKey: "order-shipped-789",
});

console.log(result.eventId);
// => "evt_abc123def456"`}
        pythonExample={`result = client.events.trigger(
    workflow="order.shipped",
    subscriber_id="user-456",
    payload={
        "order_id": "ORD-789",
        "tracking_url": "https://track.example.com/789",
    },
    channels=["email", "in_app"],
    idempotency_key="order-shipped-789",
)

print(result.event_id)
# => "evt_abc123def456"`}
        restExample={`curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "order.shipped",
    "subscriber_id": "user-456",
    "payload": {
      "order_id": "ORD-789",
      "tracking_url": "https://track.example.com/789"
    },
    "channels": ["email", "in_app"],
    "idempotency_key": "order-shipped-789"
  }'`}
        responseExample={`{
  "event_id": "evt_abc123def456",
  "status": "accepted",
  "channels_requested": ["email", "in_app"],
  "channels_matched": ["email", "in_app"],
  "warnings": [],
  "scheduled_at": null
}`}
        errors={[
          { status: "400", detail: "Missing required field: workflow" },
          { status: "401", detail: "Invalid or missing API key" },
          { status: "404", detail: "Subscriber not found (when using subscriberId)" },
          { status: "422", detail: "No workflow found matching the event name" },
          { status: "429", detail: "Rate limit exceeded" },
        ]}
      />

      {/* triggerBulk */}
      <SDKMethodBlock
        id="events-trigger-bulk"
        nodeSignature="client.events.triggerBulk(params)"
        pythonSignature="client.events.trigger_bulk(**kwargs)"
        restSignature="POST /events/trigger/bulk"
        description="Trigger a workflow for up to 1,000 subscribers in a single request. Each subscriber is processed independently — partial failures don't block the batch."
        returnType={{ node: "Promise<TriggerBulkResponse>", python: "TriggerBulkResponse", rest: "JSON object" }}
        params={[
          { name: "workflow", nodeType: "string", pythonType: "str", required: true, description: "The workflow name" },
          { name: "subscribers", nodeType: "SubscriberInline[]", pythonType: "list[dict]", required: true, description: "Array of inline subscriber objects (max 1,000)" },
          { name: "payload", nodeType: "Record<string, unknown>", pythonType: "dict", required: false, description: "Shared payload for all subscribers" },
          { name: "channels", nodeType: "Channel[]", pythonType: "list[str]", required: false, description: "Restrict channels for all subscribers" },
          { name: "idempotencyKey", nodeType: "string", pythonType: "str", required: false, description: "Deduplication key for the entire batch" },
        ]}
        nodeExample={`const result = await client.events.triggerBulk({
  workflow: "weekly-digest",
  subscribers: [
    { id: "user-1", email: "alice@co.com" },
    { id: "user-2", email: "bob@co.com" },
    { id: "user-3", email: "carol@co.com" },
  ],
  payload: { weekOf: "2026-03-15" },
});

console.log(result.accepted); // => 3
console.log(result.errors);   // => 0`}
        pythonExample={`result = client.events.trigger_bulk(
    workflow="weekly-digest",
    subscribers=[
        {"id": "user-1", "email": "alice@co.com"},
        {"id": "user-2", "email": "bob@co.com"},
        {"id": "user-3", "email": "carol@co.com"},
    ],
    payload={"week_of": "2026-03-15"},
)

print(result.accepted)  # => 3
print(result.errors)    # => 0`}
        restExample={`curl -X POST https://api.alrt.dev/events/trigger/bulk \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "weekly-digest",
    "subscribers": [
      { "id": "user-1", "email": "alice@co.com" },
      { "id": "user-2", "email": "bob@co.com" },
      { "id": "user-3", "email": "carol@co.com" }
    ],
    "payload": { "week_of": "2026-03-15" }
  }'`}
        responseExample={`{
  "batch_id": "batch_xyz789",
  "status": "accepted",
  "total": 3,
  "accepted": 3,
  "duplicates": 0,
  "errors": 0,
  "results": [
    { "subscriber_id": "user-1", "event_id": "evt_1", "status": "accepted" },
    { "subscriber_id": "user-2", "event_id": "evt_2", "status": "accepted" },
    { "subscriber_id": "user-3", "event_id": "evt_3", "status": "accepted" }
  ]
}`}
      />
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Subscribers
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SubscribersSection() {
  const subParams = [
    { name: "externalId", nodeType: "string", pythonType: "str", required: true, description: "Your system's unique user ID" },
    { name: "email", nodeType: "string", pythonType: "str", required: false, description: "Email address for email channel" },
    { name: "name", nodeType: "string", pythonType: "str", required: false, description: "Display name for templates" },
    { name: "phoneNumber", nodeType: "string", pythonType: "str", required: false, description: "Phone number for SMS/WhatsApp" },
    { name: "slackUserId", nodeType: "string", pythonType: "str", required: false, description: "Slack user ID for DM delivery" },
    { name: "discordWebhookUrl", nodeType: "string", pythonType: "str", required: false, description: "Discord webhook URL" },
    { name: "telegramChatId", nodeType: "string", pythonType: "str", required: false, description: "Telegram chat ID" },
    { name: "customProperties", nodeType: "Record<string, unknown>", pythonType: "dict", required: false, description: "Arbitrary metadata for template personalization" },
    { name: "channelPreferences", nodeType: "Record<string, unknown>", pythonType: "dict", required: false, description: "Per-channel opt-in/out preferences" },
  ];

  return (
    <section id="subscribers" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Subscribers</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "640px" }}>
        Subscribers represent the people who receive your notifications. Each subscriber has channel-specific
        contact info and delivery preferences.
      </p>

      {/* create */}
      <SDKMethodBlock
        id="subscribers-create"
        nodeSignature="client.subscribers.create(params)"
        pythonSignature="client.subscribers.create(**kwargs)"
        restSignature="POST /subscribers"
        description="Create a new subscriber with channel-specific contact information."
        returnType={{ node: "Promise<SubscriberResponse>", python: "SubscriberResponse", rest: "JSON object" }}
        params={subParams}
        nodeExample={`const sub = await client.subscribers.create({
  externalId: "user-456",
  email: "alice@example.com",
  name: "Alice Chen",
  customProperties: {
    plan: "pro",
    company: "Acme Corp",
  },
});

console.log(sub.id); // internal UUID`}
        pythonExample={`sub = client.subscribers.create(
    external_id="user-456",
    email="alice@example.com",
    name="Alice Chen",
    custom_properties={
        "plan": "pro",
        "company": "Acme Corp",
    },
)

print(sub.id)  # internal UUID`}
        restExample={`curl -X POST https://api.alrt.dev/subscribers \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "user-456",
    "email": "alice@example.com",
    "name": "Alice Chen",
    "custom_properties": {
      "plan": "pro",
      "company": "Acme Corp"
    }
  }'`}
        errors={[
          { status: "400", detail: "Invalid subscriber data" },
          { status: "409", detail: "Subscriber with this externalId already exists" },
        ]}
      />

      {/* get */}
      <SDKMethodBlock
        id="subscribers-get"
        nodeSignature="client.subscribers.get(subscriberId)"
        pythonSignature="client.subscribers.get(subscriber_id)"
        restSignature="GET /subscribers/:subscriberId"
        description="Retrieve a subscriber by their external ID."
        returnType={{ node: "Promise<SubscriberResponse>", python: "SubscriberResponse", rest: "JSON object" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
        ]}
        nodeExample={`const sub = await client.subscribers.get("user-456");

console.log(sub.email);            // "alice@example.com"
console.log(sub.customProperties); // { plan: "pro" }`}
        pythonExample={`sub = client.subscribers.get("user-456")

print(sub.email)              # "alice@example.com"
print(sub.custom_properties)  # {"plan": "pro"}`}
        restExample={`curl -X GET https://api.alrt.dev/subscribers/user-456 \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json"`}
        errors={[
          { status: "404", detail: "Subscriber not found" },
        ]}
      />

      {/* list */}
      <SDKMethodBlock
        id="subscribers-list"
        nodeSignature="client.subscribers.list(params?)"
        pythonSignature="client.subscribers.list(limit?, offset?)"
        restSignature="GET /subscribers"
        description="List subscribers with optional pagination."
        returnType={{ node: "Promise<SubscriberResponse[]>", python: "list[SubscriberResponse]", rest: "JSON array" }}
        params={[
          { name: "limit", nodeType: "number", pythonType: "int", required: false, default: "20", description: "Max results per page" },
          { name: "offset", nodeType: "number", pythonType: "int", required: false, default: "0", description: "Number of results to skip" },
        ]}
        nodeExample={`const subs = await client.subscribers.list({
  limit: 50,
  offset: 0,
});

for (const sub of subs) {
  console.log(sub.externalId, sub.email);
}`}
        pythonExample={`subs = client.subscribers.list(limit=50, offset=0)

for sub in subs:
    print(sub.external_id, sub.email)`}
        restExample={`curl -X GET "https://api.alrt.dev/subscribers?limit=50&offset=0" \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json"`}
      />

      {/* update */}
      <SDKMethodBlock
        id="subscribers-update"
        nodeSignature="client.subscribers.update(subscriberId, params)"
        pythonSignature="client.subscribers.update(subscriber_id, **kwargs)"
        restSignature="PATCH /subscribers/:subscriberId"
        description="Update a subscriber's contact info or custom properties. Only provided fields are changed."
        returnType={{ node: "Promise<SubscriberResponse>", python: "SubscriberResponse", rest: "JSON object" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
          { name: "email", nodeType: "string", pythonType: "str", required: false, description: "Updated email address" },
          { name: "name", nodeType: "string", pythonType: "str", required: false, description: "Updated display name" },
          { name: "customProperties", nodeType: "Record<string, unknown>", pythonType: "dict", required: false, description: "Updated custom properties (merges with existing)" },
        ]}
        nodeExample={`const updated = await client.subscribers.update(
  "user-456",
  {
    name: "Alice Chen-Williams",
    customProperties: { plan: "enterprise" },
  },
);`}
        pythonExample={`updated = client.subscribers.update(
    "user-456",
    name="Alice Chen-Williams",
    custom_properties={"plan": "enterprise"},
)`}
        restExample={`curl -X PATCH https://api.alrt.dev/subscribers/user-456 \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Alice Chen-Williams",
    "custom_properties": { "plan": "enterprise" }
  }'`}
        errors={[
          { status: "404", detail: "Subscriber not found" },
        ]}
      />

      {/* delete */}
      <SDKMethodBlock
        id="subscribers-delete"
        nodeSignature="client.subscribers.delete(subscriberId)"
        pythonSignature="client.subscribers.delete(subscriber_id)"
        restSignature="DELETE /subscribers/:subscriberId"
        description="Permanently delete a subscriber and all their notification history."
        returnType={{ node: "Promise<void>", python: "None", rest: "204 No Content" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
        ]}
        nodeExample={`await client.subscribers.delete("user-456");`}
        pythonExample={`client.subscribers.delete("user-456")`}
        restExample={`curl -X DELETE https://api.alrt.dev/subscribers/user-456 \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json"`}
        errors={[
          { status: "404", detail: "Subscriber not found" },
        ]}
      />
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Preferences
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PreferencesSection() {
  return (
    <section id="preferences" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Preferences</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "640px" }}>
        Manage subscriber notification preferences — global channel opt-in/out, per-category settings,
        do-not-disturb windows, and frequency caps.
      </p>

      <SDKMethodBlock
        id="preferences-get"
        nodeSignature="client.subscribers.getPreferences(subscriberId)"
        pythonSignature="client.subscribers.get_preferences(subscriber_id)"
        restSignature="GET /subscribers/:subscriberId/preferences"
        description="Get the notification preferences for a subscriber."
        returnType={{ node: "Promise<PreferencesResponse>", python: "PreferencesResponse", rest: "JSON object" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
        ]}
        nodeExample={`const prefs = await client.subscribers
  .getPreferences("user-456");

console.log(prefs.global);
// => { email: true, slack: true, in_app: true }

console.log(prefs.dnd);
// => { timezone: "US/Pacific", start: "22:00", end: "08:00" }`}
        pythonExample={`prefs = client.subscribers.get_preferences("user-456")

print(prefs.global_prefs)
# => {"email": True, "slack": True, "in_app": True}

print(prefs.dnd)
# => {"timezone": "US/Pacific", "start": "22:00", "end": "08:00"}`}
      />

      <SDKMethodBlock
        id="preferences-update"
        nodeSignature="client.subscribers.updatePreferences(subscriberId, prefs)"
        pythonSignature="client.subscribers.update_preferences(subscriber_id, preferences)"
        description="Update notification preferences. Supports granular per-category and per-channel settings."
        returnType={{ node: "Promise<PreferencesResponse>", python: "PreferencesResponse" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
          { name: "global", nodeType: "Record<string, boolean>", pythonType: "dict[str, bool]", required: false, description: "Global channel on/off toggles" },
          { name: "categories", nodeType: "Record<string, Record<string, boolean>>", pythonType: "dict[str, dict[str, bool]]", required: false, description: "Per-category channel preferences" },
          { name: "dnd", nodeType: "{ timezone, start, end }", pythonType: "dict", required: false, description: "Do-not-disturb window" },
          { name: "frequency", nodeType: "{ maxPerDay?, maxPerHour? }", pythonType: "dict", required: false, description: "Rate limits per subscriber" },
        ]}
        nodeExample={`await client.subscribers.updatePreferences(
  "user-456",
  {
    global: { email: true, slack: false },
    categories: {
      marketing: { email: false, in_app: true },
    },
    dnd: {
      timezone: "US/Pacific",
      start: "22:00",
      end: "08:00",
    },
  },
);`}
        pythonExample={`client.subscribers.update_preferences(
    "user-456",
    {
        "global": {"email": True, "slack": False},
        "categories": {
            "marketing": {"email": False, "in_app": True},
        },
        "dnd": {
            "timezone": "US/Pacific",
            "start": "22:00",
            "end": "08:00",
        },
    },
)`}
      />
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Push Tokens
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PushTokensSection() {
  return (
    <section id="push-tokens" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Push Tokens</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "640px" }}>
        Register and manage device push tokens for mobile and web push notifications via FCM/APNs.
      </p>

      <SDKMethodBlock
        id="push-register"
        nodeSignature="client.subscribers.registerPushToken(subscriberId, params)"
        pythonSignature="client.subscribers.register_push_token(subscriber_id, **kwargs)"
        description="Register a push notification token for a subscriber's device."
        returnType={{ node: "Promise<PushTokenResponse[]>", python: "list[PushTokenResponse]" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
          { name: "token", nodeType: "string", pythonType: "str", required: true, description: "The FCM/APNs push token" },
          { name: "platform", nodeType: '"android" | "ios" | "web"', pythonType: '"android" | "ios" | "web"', required: true, description: "Device platform" },
          { name: "deviceId", nodeType: "string", pythonType: "str", required: false, description: "Unique device identifier for token replacement" },
        ]}
        nodeExample={`const tokens = await client.subscribers
  .registerPushToken("user-456", {
    token: "fcm_dK8x...",
    platform: "android",
    deviceId: "pixel-7-abc",
  });

console.log(tokens.length); // => 1`}
        pythonExample={`tokens = client.subscribers.register_push_token(
    "user-456",
    token="fcm_dK8x...",
    platform="android",
    device_id="pixel-7-abc",
)

print(len(tokens))  # => 1`}
      />

      <SDKMethodBlock
        id="push-list"
        nodeSignature="client.subscribers.listPushTokens(subscriberId)"
        pythonSignature="client.subscribers.list_push_tokens(subscriber_id)"
        description="List all registered push tokens for a subscriber."
        returnType={{ node: "Promise<PushTokenResponse[]>", python: "list[PushTokenResponse]" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
        ]}
        nodeExample={`const tokens = await client.subscribers
  .listPushTokens("user-456");

for (const t of tokens) {
  console.log(t.platform, t.token);
}`}
        pythonExample={`tokens = client.subscribers.list_push_tokens("user-456")

for t in tokens:
    print(t.platform, t.token)`}
      />

      <SDKMethodBlock
        id="push-remove"
        nodeSignature="client.subscribers.removePushToken(subscriberId, token)"
        pythonSignature="client.subscribers.remove_push_token(subscriber_id, token)"
        description="Remove a specific push token from a subscriber (e.g., on logout or token rotation)."
        returnType={{ node: "Promise<PushTokenResponse[]>", python: "list[PushTokenResponse]" }}
        params={[
          { name: "subscriberId", nodeType: "string", pythonType: "str", required: true, description: "The subscriber's external ID" },
          { name: "token", nodeType: "string", pythonType: "str", required: true, description: "The push token to remove" },
        ]}
        nodeExample={`const remaining = await client.subscribers
  .removePushToken("user-456", "fcm_dK8x...");`}
        pythonExample={`remaining = client.subscribers.remove_push_token(
    "user-456", "fcm_dK8x..."
)`}
      />
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: Error Handling
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ErrorHandlingSection() {
  const { language } = useLanguage();

  return (
    <section id="error-handling" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>Error Handling</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "16px", maxWidth: "640px" }}>
        The SDK throws typed exceptions for all API errors. All errors extend{" "}
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-accent)" }}>
          {language === "node" ? "AlrtError" : "AlrtError"}
        </code>{" "}
        and include <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>status</code>,{" "}
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>code</code>, and{" "}
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>message</code> properties.
      </p>

      {/* Error class hierarchy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start", marginBottom: "32px" }}>
        <div>
          <h4
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-muted)",
              marginBottom: "10px",
            }}
          >
            Exception Hierarchy
          </h4>
          <div
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            {[
              { name: language === "node" ? "AlrtAuthError" : "AlrtAuthError", status: "401", desc: "Invalid or missing API key" },
              { name: language === "node" ? "AlrtValidationError" : "AlrtValidationError", status: "400/422", desc: "Invalid request data" },
              { name: language === "node" ? "AlrtNotFoundError" : "AlrtNotFoundError", status: "404", desc: "Resource not found" },
              { name: language === "node" ? "AlrtConflictError" : "AlrtConflictError", status: "409", desc: "Resource already exists" },
              { name: language === "node" ? "AlrtRateLimitError" : "AlrtRateLimitError", status: "429", desc: "Rate limit exceeded (includes retryAfter)" },
              { name: language === "node" ? "AlrtApiError" : "AlrtApiError", status: "5xx", desc: "Server error" },
            ].map((err, i, arr) => (
              <div
                key={err.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 60px 1fr",
                  gap: "8px",
                  padding: "10px 14px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : undefined,
                  alignItems: "baseline",
                }}
              >
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {err.name}
                </code>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#f87171" }}>
                  {err.status}
                </code>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {err.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <SDKCodePane
          node={`import {
  AlrtError,
  AlrtAuthError,
  AlrtRateLimitError,
  AlrtNotFoundError,
} from "@alrt/node";

try {
  await client.events.trigger({
    workflow: "welcome",
    subscriberId: "user-123",
  });
} catch (err) {
  if (err instanceof AlrtRateLimitError) {
    console.log("Retry after:", err.retryAfter);
  } else if (err instanceof AlrtNotFoundError) {
    console.log("Subscriber missing:", err.message);
  } else if (err instanceof AlrtAuthError) {
    console.error("Check your API key");
  } else if (err instanceof AlrtError) {
    console.error(err.status, err.code, err.message);
  }
}`}
          python={`from alrt import (
    AlrtError,
    AlrtAuthError,
    AlrtRateLimitError,
    AlrtNotFoundError,
)

try:
    client.events.trigger(
        workflow="welcome",
        subscriber_id="user-123",
    )
except AlrtRateLimitError as e:
    print(f"Retry after: {e.retry_after}")
except AlrtNotFoundError as e:
    print(f"Subscriber missing: {e.message}")
except AlrtAuthError:
    print("Check your API key")
except AlrtError as e:
    print(e.status, e.code, e.message)`}
          rest={`# Check HTTP status code for error handling
RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST \\
  https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"workflow": "welcome", "subscriber_id": "user-123"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "Success: $BODY"
elif [ "$HTTP_CODE" -eq 429 ]; then
  echo "Rate limited. Check Retry-After header."
elif [ "$HTTP_CODE" -eq 401 ]; then
  echo "Auth error. Check your API key."
else
  echo "Error $HTTP_CODE: $BODY"
fi`}
        />
      </div>

      {/* Retry behavior */}
      <SubHeading>Automatic Retries</SubHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "16px", maxWidth: "640px" }}>
        The SDK automatically retries requests that fail with <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>429</code> (rate limit) or{" "}
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>5xx</code> (server error) status codes, using exponential backoff with jitter.
        Non-retryable errors (400, 401, 404, 409) are thrown immediately.
      </p>
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
          padding: "14px 16px",
          display: "flex",
          gap: "24px",
          maxWidth: "500px",
        }}
      >
        {[
          { label: "Max retries", value: "3" },
          { label: "Base delay", value: "500ms" },
          { label: "Strategy", value: "Exponential + jitter" },
          { label: "Retry-After", value: "Respected" },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)", marginBottom: "2px" }}>
              {item.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SECTION: WebSocket
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function WebSocketSection() {
  return (
    <section id="websocket" style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <SectionHeading>WebSocket (In-App Notifications)</SectionHeading>
      <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "16px", maxWidth: "640px" }}>
        For real-time in-app notifications, connect to the WebSocket endpoint using a subscriber-scoped JWT.
        This is a direct WebSocket connection — no SDK wrapper needed.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        <div>
          <SubHeading>How it works</SubHeading>
          <ol style={{ paddingLeft: "20px", color: "var(--color-text-secondary)", fontSize: "13px", lineHeight: 2 }}>
            <li>Server-side: call <code style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>POST /subscribers/:id/token</code> to get a short-lived JWT</li>
            <li>Client-side: connect to <code style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>ws://api.alrt.dev/ws?token=JWT</code></li>
            <li>Receive real-time notification payloads as JSON messages</li>
          </ol>
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "rgba(211, 47, 47, 0.08)",
              border: "1px solid rgba(211, 47, 47, 0.15)",
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--color-accent)" }}>Note:</strong> Subscriber JWTs expire after 1 hour. Implement reconnection logic with token refresh.
          </div>
        </div>

        <SDKCodePane
          node={`// Server: get subscriber token
const res = await fetch(
  "https://api.alrt.dev/subscribers/user-456/token",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer alrt_sk_...",
      "Content-Type": "application/json",
    },
  }
);
const { token } = await res.json();

// Client: connect WebSocket
const ws = new WebSocket(
  \`wss://api.alrt.dev/ws?token=\${token}\`
);

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log("New:", notification.title);
};`}
          python={`# Server: get subscriber token
import httpx

resp = httpx.post(
    "https://api.alrt.dev/subscribers/user-456/token",
    headers={"Authorization": "Bearer alrt_sk_..."},
)
token = resp.json()["token"]

# Client: connect WebSocket (using websockets lib)
import asyncio
import websockets
import json

async def listen():
    uri = f"wss://api.alrt.dev/ws?token={token}"
    async with websockets.connect(uri) as ws:
        async for message in ws:
            notification = json.loads(message)
            print("New:", notification["title"])

asyncio.run(listen())`}
          rest={`# Step 1: Get subscriber token
TOKEN=$(curl -s -X POST \\
  https://api.alrt.dev/subscribers/user-456/token \\
  -H "Authorization: Bearer alrt_sk_..." \\
  -H "Content-Type: application/json" \\
  | jq -r '.token')

# Step 2: Connect via WebSocket (using websocat)
websocat "wss://api.alrt.dev/ws?token=$TOKEN"`}
        />
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SHARED UI PRIMITIVES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "22px",
        fontWeight: 700,
        color: "var(--color-text-primary)",
        marginBottom: "8px",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: "15px",
        fontWeight: 600,
        color: "var(--color-text-primary)",
        marginBottom: "10px",
      }}
    >
      {children}
    </h3>
  );
}
