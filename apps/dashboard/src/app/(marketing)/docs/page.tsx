"use client";

import { DocsSidebar, EndpointBlock } from "@/components/docs";
import {
  Card,
  CodeBlock,
} from "@/components/ui";
import Link from "next/link";

const SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "authentication", label: "Authentication" },
  { id: "events", label: "Events" },
  { id: "subscribers", label: "Subscribers" },
  { id: "notifications", label: "Notifications" },
  { id: "websocket", label: "WebSocket" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] px-6 py-3 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1">
              <span className="font-brand text-lg font-bold text-text-primary">ALRT</span>
              <span className="font-mono text-xs text-text-muted">.dev</span>
            </Link>
            <span className="text-[rgba(255,255,255,0.12)]">/</span>
            <span className="text-sm text-text-secondary font-medium">Docs</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-text-muted hover:text-text-primary transition-colors">Home</Link>
            <Link href="/workflows" className="text-sm text-text-muted hover:text-text-primary transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Sidebar */}
        <div className="hidden lg:block w-56 shrink-0 sticky top-[49px] h-[calc(100vh-49px)] overflow-y-auto border-r border-[rgba(255,255,255,0.06)]">
          <DocsSidebar sections={SECTIONS} />
        </div>

        {/* Content */}
        <main className="flex-1 py-12 px-8 lg:px-16 min-w-0 max-w-5xl">

          {/* ── GETTING STARTED ── */}
          <section id="getting-started" className="scroll-mt-20">
            <h1 className="text-2xl font-semibold text-text-primary mb-1 tracking-tight">
              API Reference
            </h1>
            <p className="text-sm text-text-muted mb-8">
              Base URL:{" "}
              <code className="font-mono text-text-secondary bg-elevated rounded px-1.5 py-0.5">
                https://api.alrt.dev
              </code>
            </p>

            <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Quick start</h2>
            <p className="text-sm text-text-secondary mb-6 max-w-xl">
              Get up and running in three steps. All requests use your server
              key as a Bearer token.
            </p>

            <div className="space-y-4 max-w-2xl">
              <Card title="1. Get your API key">
                <p className="text-sm text-text-secondary mb-3">
                  Sign up at{" "}
                  <code className="font-mono text-xs bg-elevated rounded px-1 text-accent">
                    alrt.dev
                  </code>{" "}
                  to create your team. Your server key (
                  <code className="font-mono text-xs bg-elevated rounded px-1 text-text-secondary">
                    alrt_sk_...
                  </code>
                  ) is shown once on the settings page.
                </p>
              </Card>

              <Card title="2. Trigger a notification">
                <p className="text-sm text-text-secondary mb-3">
                  Fire an event. The subscriber is automatically created or
                  updated from the inline object.
                </p>
                <CodeBlock
                  title="Request"
                  code={`curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "welcome",
    "subscriber": {
      "id": "user_1",
      "email": "jane@example.com",
      "name": "Jane"
    },
    "payload": {"name": "Jane"}
  }'`}
                />
              </Card>

              <Card title="3. Fetch notifications">
                <p className="text-sm text-text-secondary mb-3">
                  Read the in-app feed for a subscriber.
                </p>
                <CodeBlock
                  title="Request"
                  code={`curl https://api.alrt.dev/subscribers/user_1/notifications \\
  -H "Authorization: Bearer $KEY"`}
                />
              </Card>
            </div>
          </section>

          <hr className="border-0 border-t border-[rgba(255,255,255,0.06)] my-12" />

          {/* ── AUTHENTICATION ── */}
          <section id="authentication" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Authentication</h2>
            <p className="text-sm text-text-secondary mb-6 max-w-xl">
              All requests require a Bearer token in the{" "}
              <code className="font-mono text-xs bg-elevated rounded px-1 text-text-secondary">
                Authorization
              </code>{" "}
              header.
            </p>

            <CodeBlock
              title="Header"
              code={`Authorization: Bearer alrt_sk_live_abc123...`}
            />

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Key types
                </h3>
                <div className="rounded-md border border-[rgba(255,255,255,0.08)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[rgba(255,255,255,0.03)]">
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Prefix</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Type</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-medium text-success">alrt_sk_</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Server Key</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Full access (read + write)</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-medium text-warning">alrt_ck_</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Client Key</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Read-only (frontend / WebSocket)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Rate limits
                </h3>
                <div className="rounded-md border border-[rgba(255,255,255,0.08)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[rgba(255,255,255,0.03)]">
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Tier</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Limit</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Applies to</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <td className="px-3 py-2.5 text-xs font-mono text-text-secondary">Write</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">60 req/min</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">POST, PATCH, PUT, DELETE</td>
                      </tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <td className="px-3 py-2.5 text-xs font-mono text-text-secondary">Read</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">120 req/min</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">GET</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-xs font-mono text-text-secondary">Public</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">30 req/min</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Unauthenticated</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-0 border-t border-[rgba(255,255,255,0.06)] my-12" />

          {/* ── EVENTS ── */}
          <section id="events" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Events</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-xl">
              Trigger workflow execution by firing named events. Each event name
              maps to one workflow. Subscribers are automatically upserted on every trigger.
            </p>

            <EndpointBlock
              method="POST"
              path="/events/trigger"
              description="Trigger a workflow for a single subscriber. The subscriber is upserted automatically. The matched workflow executes asynchronously and delivers to all configured channels."
              bodyParams={[
                {
                  name: "workflow",
                  type: "string",
                  required: true,
                  description:
                    "The event name mapped to a workflow (e.g. 'welcome', 'invoice.paid').",
                },
                {
                  name: "subscriber",
                  type: "object",
                  required: true,
                  description:
                    "The subscriber to notify. Must include id (your external user ID). Optionally include email, name, phone, and data to upsert subscriber info.",
                },
                {
                  name: "payload",
                  type: "object",
                  required: false,
                  default: "{}",
                  description:
                    "Key-value data passed to templates for variable substitution (e.g. {{payload.name}}).",
                },
                {
                  name: "channels",
                  type: "string[]",
                  required: false,
                  description:
                    'Optional channel filter. Values: "in_app", "email", "slack". If omitted, all workflow channels fire.',
                },
                {
                  name: "overrides",
                  type: "object",
                  required: false,
                  description:
                    "Per-channel overrides. Supported keys: email (to, subject, reply_to, cc, bcc), slack (channel_id, thread_ts), in_app (action_url).",
                },
                {
                  name: "deliver_at",
                  type: "ISO 8601",
                  required: false,
                  description:
                    "Schedule delivery for a future time. The execution is held until the specified time.",
                },
                {
                  name: "metadata",
                  type: "object",
                  required: false,
                  default: "{}",
                  description:
                    "Arbitrary metadata stored with the execution for your own tracking.",
                },
                {
                  name: "idempotency_key",
                  type: "string",
                  required: false,
                  description:
                    "Unique key to prevent duplicate triggers within a 24h window.",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "welcome",
    "subscriber": {
      "id": "user_1",
      "email": "jane@example.com",
      "name": "Jane"
    },
    "payload": {"name": "Jane", "plan": "Pro"},
    "channels": ["in_app", "email"],
    "idempotency_key": "evt_abc123"
  }'`}
              responseExample={`{
  "event_id": "evt_01HX...",
  "status": "accepted",
  "channels_requested": ["in_app", "email"],
  "channels_matched": ["in_app", "email"],
  "warnings": []
}`}
              responseStatus="202 Accepted"
              errors={[
                {
                  status: "404",
                  detail: "No published workflow for this event.",
                },
              ]}
            />

            <EndpointBlock
              method="POST"
              path="/events/trigger-bulk"
              description="Trigger a workflow for up to 1,000 subscribers in a single request. Each subscriber is upserted and processed individually."
              bodyParams={[
                {
                  name: "workflow",
                  type: "string",
                  required: true,
                  description:
                    "The event name mapped to a workflow.",
                },
                {
                  name: "subscribers",
                  type: "object[]",
                  required: true,
                  description:
                    "Array of subscriber objects (max 1,000). Each must include id. Optionally include email, name, phone, data.",
                },
                {
                  name: "payload",
                  type: "object",
                  required: false,
                  default: "{}",
                  description:
                    "Shared payload passed to all subscribers' templates.",
                },
                {
                  name: "channels",
                  type: "string[]",
                  required: false,
                  description:
                    "Optional channel filter applied to all subscribers.",
                },
                {
                  name: "overrides",
                  type: "object",
                  required: false,
                  description:
                    "Per-channel overrides applied to all subscribers.",
                },
                {
                  name: "deliver_at",
                  type: "ISO 8601",
                  required: false,
                  description:
                    "Schedule delivery for all subscribers at a future time.",
                },
                {
                  name: "metadata",
                  type: "object",
                  required: false,
                  default: "{}",
                  description:
                    "Arbitrary metadata stored with each execution.",
                },
                {
                  name: "idempotency_key",
                  type: "string",
                  required: false,
                  description:
                    "Batch-level idempotency key (24h window).",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/events/trigger-bulk \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "weekly-digest",
    "subscribers": [
      {"id": "user_1", "email": "jane@example.com"},
      {"id": "user_2", "email": "alex@example.com"},
      {"id": "user_3", "email": "sam@example.com"}
    ],
    "payload": {"week": "2025-W03"}
  }'`}
              responseExample={`{
  "batch_id": "batch_01HX...",
  "status": "accepted",
  "total": 3,
  "accepted": 3,
  "duplicates": 0,
  "errors": 0,
  "results": [
    {"subscriber_id": "user_1", "event_id": "evt_01HX...", "status": "accepted"},
    {"subscriber_id": "user_2", "event_id": "evt_02HX...", "status": "accepted"},
    {"subscriber_id": "user_3", "event_id": "evt_03HX...", "status": "accepted"}
  ]
}`}
              responseStatus="202 Accepted"
              errors={[
                {
                  status: "404",
                  detail: "No published workflow for this event.",
                },
              ]}
            />
          </section>

          <hr className="border-0 border-t border-[rgba(255,255,255,0.06)] my-12" />

          {/* ── SUBSCRIBERS ── */}
          <section id="subscribers" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Subscribers</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-xl">
              Manage the users who receive notifications. Each subscriber is
              identified by a unique{" "}
              <code className="font-mono text-xs bg-elevated rounded px-1 text-text-secondary">
                external_id
              </code>{" "}
              that you define.
            </p>

            <EndpointBlock
              method="POST"
              path="/subscribers"
              description="Create a new subscriber. The external_id must be unique within your team."
              bodyParams={[
                { name: "external_id", type: "string", required: true, description: "Your application's unique user identifier." },
                { name: "email", type: "string", required: false, description: "Email address for the email channel." },
                { name: "name", type: "string", required: false, description: "Display name used in templates." },
                { name: "phone_number", type: "string", required: false, description: "Phone number for SMS/WhatsApp." },
                { name: "custom_properties", type: "object", required: false, description: "Arbitrary key-value metadata for template rendering." },
                { name: "channel_preferences", type: "object", required: false, description: 'Per-channel opt-in/out. E.g. {"email": true, "in_app": true, "slack": false}.' },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/subscribers \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "user_1",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "channel_preferences": {
      "email": true,
      "in_app": true,
      "slack": false
    }
  }'`}
              responseExample={`{
  "id": "sub_01HX...",
  "external_id": "user_1",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": false
  },
  "created_at": "2025-01-15T10:30:00Z"
}`}
              responseStatus="201 Created"
              errors={[{ status: "409", detail: "Subscriber with this external_id already exists." }]}
            />

            <EndpointBlock
              method="GET"
              path="/subscribers/{external_id}"
              description="Retrieve a single subscriber by their external_id."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              requestExample={`curl https://api.alrt.dev/subscribers/user_1 \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "id": "sub_01HX...",
  "external_id": "user_1",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": false
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />

            <EndpointBlock
              method="PATCH"
              path="/subscribers/{external_id}"
              description="Update subscriber fields. Only provided fields are changed."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              bodyParams={[
                { name: "email", type: "string", required: false, description: "Updated email address." },
                { name: "name", type: "string", required: false, description: "Updated display name." },
                { name: "phone_number", type: "string", required: false, description: "Updated phone number." },
                { name: "custom_properties", type: "object", required: false, description: "Merged with existing custom properties." },
                { name: "channel_preferences", type: "object", required: false, description: "Updated channel preferences." },
              ]}
              requestExample={`curl -X PATCH https://api.alrt.dev/subscribers/user_1 \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Jane Smith", "email": "jane.smith@example.com"}'`}
              responseExample={`{
  "id": "sub_01HX...",
  "external_id": "user_1",
  "email": "jane.smith@example.com",
  "name": "Jane Smith",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T12:00:00Z"
}`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />

            <EndpointBlock
              method="DELETE"
              path="/subscribers/{external_id}"
              description="Permanently delete a subscriber and all their notifications."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              requestExample={`curl -X DELETE https://api.alrt.dev/subscribers/user_1 \\
  -H "Authorization: Bearer $KEY"`}
              responseStatus="204 No Content"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />

            <EndpointBlock
              method="GET"
              path="/subscribers/{external_id}/preferences"
              description="Retrieve a subscriber's per-channel notification preferences."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              requestExample={`curl https://api.alrt.dev/subscribers/user_1/preferences \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": false
  }
}`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />

            <EndpointBlock
              method="PATCH"
              path="/subscribers/{external_id}/preferences"
              description="Replace a subscriber's channel preferences. This is a full replacement, not a merge."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              bodyParams={[{ name: "channel_preferences", type: "object", required: true, description: 'Full replacement of channel preferences. E.g. {"email": true, "in_app": true, "slack": true}.' }]}
              requestExample={`curl -X PATCH https://api.alrt.dev/subscribers/user_1/preferences \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel_preferences": {
      "email": true,
      "in_app": true,
      "slack": true
    }
  }'`}
              responseExample={`{
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": true
  }
}`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />

            <EndpointBlock
              method="POST"
              path="/subscribers/{external_id}/token"
              description="Generate a short-lived JWT for WebSocket authentication. The token expires after 24 hours."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              requestExample={`curl -X POST https://api.alrt.dev/subscribers/user_1/token \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />
          </section>

          <hr className="border-0 border-t border-[rgba(255,255,255,0.06)] my-12" />

          {/* ── NOTIFICATIONS ── */}
          <section id="notifications" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Notifications</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-xl">
              Query and manage a subscriber&apos;s in-app notification feed.
            </p>

            <EndpointBlock
              method="GET"
              path="/subscribers/{external_id}/notifications"
              description="List notifications for a subscriber with filtering and pagination."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              queryParams={[
                { name: "channel", type: "string", required: false, description: 'Filter by channel: "in_app", "email", or "slack".' },
                { name: "is_read", type: "boolean", required: false, description: "Filter by read status." },
                { name: "limit", type: "integer", required: false, default: "20", description: "Number of results to return. Max 100." },
                { name: "offset", type: "integer", required: false, default: "0", description: "Number of results to skip." },
              ]}
              requestExample={`curl "https://api.alrt.dev/subscribers/user_1/notifications?is_read=false&limit=10" \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`[
  {
    "id": "ntf_01HX...",
    "channel": "in_app",
    "subject": "Welcome to Acme!",
    "body": "Hey Jane, your account is ready.",
    "is_read": false,
    "is_archived": false,
    "payload": {"name": "Jane"},
    "created_at": "2025-01-15T10:31:00Z"
  }
]`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />

            <EndpointBlock
              method="PATCH"
              path="/subscribers/{external_id}/notifications/{notification_id}"
              description="Update a single notification's read or archived status."
              pathParams={[
                { name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." },
                { name: "notification_id", type: "string", required: true, description: "The notification ID." },
              ]}
              bodyParams={[
                { name: "is_read", type: "boolean", required: false, description: "Mark as read or unread." },
                { name: "is_archived", type: "boolean", required: false, description: "Mark as archived or unarchived." },
              ]}
              requestExample={`curl -X PATCH https://api.alrt.dev/subscribers/user_1/notifications/ntf_01HX \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"is_read": true}'`}
              responseExample={`{
  "id": "ntf_01HX...",
  "channel": "in_app",
  "subject": "Welcome to Acme!",
  "body": "Hey Jane, your account is ready.",
  "is_read": true,
  "is_archived": false,
  "payload": {"name": "Jane"},
  "created_at": "2025-01-15T10:31:00Z"
}`}
              responseStatus="200 OK"
              errors={[{ status: "404", detail: "Notification not found." }]}
            />

            <EndpointBlock
              method="POST"
              path="/subscribers/{external_id}/notifications/mark-all-read"
              description="Mark all of a subscriber's notifications as read in one batch."
              pathParams={[{ name: "external_id", type: "string", required: true, description: "The subscriber's unique identifier." }]}
              requestExample={`curl -X POST https://api.alrt.dev/subscribers/user_1/notifications/mark-all-read \\
  -H "Authorization: Bearer $KEY"`}
              responseStatus="204 No Content"
              errors={[{ status: "404", detail: "Subscriber not found." }]}
            />
          </section>

          <hr className="border-0 border-t border-[rgba(255,255,255,0.06)] my-12" />

          {/* ── WEBSOCKET ── */}
          <section id="websocket" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">WebSocket</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-xl">
              Receive real-time in-app notifications over a persistent WebSocket
              connection. Authenticate using a subscriber-scoped JWT.
            </p>

            <div className="max-w-2xl space-y-8">
              {/* Connection info */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Connection
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">Endpoint</p>
                    <code className="font-mono text-sm text-text-primary bg-elevated rounded-md px-3 py-1.5 block">
                      wss://api.alrt.dev/ws?token=&lt;jwt&gt;
                    </code>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Obtain a JWT via{" "}
                    <code className="font-mono text-xs bg-elevated rounded px-1 text-text-secondary">
                      POST /subscribers/{"{external_id}"}/token
                    </code>{" "}
                    using your server key. Pass the token as the{" "}
                    <code className="font-mono text-xs bg-elevated rounded px-1 text-text-secondary">
                      token
                    </code>{" "}
                    query parameter. Tokens expire after 24 hours.
                  </p>
                </div>
              </div>

              {/* Client messages */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Client messages
                </h3>
                <div className="rounded-md border border-[rgba(255,255,255,0.08)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[rgba(255,255,255,0.03)]">
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)] w-[120px]">Type</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)] w-[120px]">Payload</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-medium text-text-primary">ping</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-muted">&mdash;</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Server responds with <code className="font-mono text-xs bg-elevated rounded px-1">pong</code>. Use as a keep-alive.</td>
                      </tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-medium text-text-primary">mark_read</code></td>
                        <td className="px-3 py-2.5"><code className="font-mono text-[11px] text-text-muted">notification_id</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Mark a single notification as read.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-medium text-text-primary">mark_all_read</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-muted">&mdash;</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Mark all notifications as read.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Server messages */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Server messages
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  When a notification is delivered to the in-app channel, the
                  server pushes the full notification object:
                </p>
                <CodeBlock
                  title="Server Push"
                  code={`{
  "type": "notification",
  "data": {
    "id": "ntf_01HX...",
    "channel": "in_app",
    "subject": "New comment on your post",
    "body": "Alex replied to your thread.",
    "is_read": false,
    "payload": {"thread_id": "thr_42"},
    "created_at": "2025-01-15T10:31:00Z"
  }
}`}
                />
              </div>

              {/* Error codes */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Error codes
                </h3>
                <div className="rounded-md border border-[rgba(255,255,255,0.08)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[rgba(255,255,255,0.03)]">
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)] w-[60px]">Code</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-text-muted border-b border-[rgba(255,255,255,0.08)]">Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-semibold text-danger">4001</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Invalid or expired JWT. Re-fetch a token and reconnect.</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5"><code className="font-mono text-xs font-semibold text-danger">4000</code></td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">Connection replaced. A new WebSocket connection was opened for the same subscriber.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
                  Example client
                </h3>
                <CodeBlock
                  title="websocket-client.ts"
                  code={`const token = await fetch("/api/ws-token").then(r => r.json());
const ws = new WebSocket("wss://api.alrt.dev/ws?token=" + token);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "notification") {
    showToast(msg.data.subject);
  }
};

// Keep-alive ping every 30s
setInterval(() => ws.send(JSON.stringify({ type: "ping" })), 30000);

// Mark a notification as read
ws.send(JSON.stringify({
  type: "mark_read",
  notification_id: "ntf_01HX..."
}));`}
                />
              </div>
            </div>
          </section>

          {/* Bottom spacer */}
          <div className="h-32" />
        </main>
      </div>
    </div>
  );
}
