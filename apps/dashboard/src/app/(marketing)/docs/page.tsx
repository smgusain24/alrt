"use client";

import { DocsSidebar, EndpointBlock } from "@/components/docs";
import { CodeBlock } from "@/components/ui";
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
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      {/* Top bar */}
      <nav
        style={{
          background: "rgba(10,10,11,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-border)",
          padding: "12px 24px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                  fontFamily: "var(--font-brand)",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                ALRT
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              >
                .dev
              </span>
            </Link>
            <span style={{ color: "rgba(255,255,255,0.12)" }}>/</span>
            <span
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
              }}
            >
              Docs
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link
              href="/"
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                textDecoration: "none",
              }}
            >
              Home
            </Link>
            <Link
              href="/workflows"
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                textDecoration: "none",
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: "224px",
            flexShrink: 0,
            position: "sticky",
            top: "49px",
            height: "calc(100vh - 49px)",
            overflowY: "auto",
            borderRight: "1px solid var(--color-border)",
          }}
        >
          <DocsSidebar sections={SECTIONS} />
        </div>

        {/* Content */}
        <main
          style={{
            flex: 1,
            padding: "48px 64px",
            minWidth: 0,
            maxWidth: "960px",
          }}
        >
          {/* -- GETTING STARTED -- */}
          <section id="getting-started" style={{ scrollMarginTop: "80px" }}>
            <h1>API Reference</h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "32px" }}>
              Base URL:{" "}
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-secondary)",
                  background: "var(--color-elevated)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                }}
              >
                https://api.alrt.dev
              </code>
            </p>

            <h2>Quick start</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "24px",
                maxWidth: "560px",
              }}
            >
              Get up and running in three steps. All requests use your server
              key as a Bearer token.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxWidth: "640px",
              }}
            >
              <article className="card">
                <header>
                  <h3>1. Get your API key</h3>
                </header>
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                  Sign up at{" "}
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      background: "var(--color-elevated)",
                      borderRadius: "4px",
                      padding: "1px 4px",
                      color: "var(--color-accent)",
                    }}
                  >
                    alrt.dev
                  </code>{" "}
                  to create your team. Your server key (
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      background: "var(--color-elevated)",
                      borderRadius: "4px",
                      padding: "1px 4px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    alrt_sk_...
                  </code>
                  ) is shown once on the settings page.
                </p>
              </article>

              <article className="card">
                <header>
                  <h3>2. Trigger a notification</h3>
                </header>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    marginBottom: "12px",
                  }}
                >
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
              </article>

              <article className="card">
                <header>
                  <h3>3. Fetch notifications</h3>
                </header>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    marginBottom: "12px",
                  }}
                >
                  Read the in-app feed for a subscriber.
                </p>
                <CodeBlock
                  title="Request"
                  code={`curl https://api.alrt.dev/subscribers/user_1/notifications \\
  -H "Authorization: Bearer $KEY"`}
                />
              </article>
            </div>
          </section>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--color-border)",
              margin: "48px 0",
            }}
          />

          {/* -- AUTHENTICATION -- */}
          <section id="authentication" style={{ scrollMarginTop: "80px" }}>
            <h2>Authentication</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "24px",
                maxWidth: "560px",
              }}
            >
              All requests require a Bearer token in the{" "}
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  background: "var(--color-elevated)",
                  borderRadius: "4px",
                  padding: "1px 4px",
                  color: "var(--color-text-secondary)",
                }}
              >
                Authorization
              </code>{" "}
              header.
            </p>

            <CodeBlock
              title="Header"
              code={`Authorization: Bearer alrt_sk_live_abc123...`}
            />

            <div
              style={{
                marginTop: "32px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "32px",
                maxWidth: "640px",
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Key types
                </h4>
                <div className="table">
                  <table>
                    <thead>
                      <tr>
                        <th>Prefix</th>
                        <th>Type</th>
                        <th>Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <code
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "#4ade80",
                            }}
                          >
                            alrt_sk_
                          </code>
                        </td>
                        <td style={{ fontSize: "12px" }}>Server Key</td>
                        <td style={{ fontSize: "12px" }}>Full access (read + write)</td>
                      </tr>
                      <tr>
                        <td>
                          <code
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "#fbbf24",
                            }}
                          >
                            alrt_ck_
                          </code>
                        </td>
                        <td style={{ fontSize: "12px" }}>Client Key</td>
                        <td style={{ fontSize: "12px" }}>Read-only (frontend / WebSocket)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Rate limits
                </h4>
                <div className="table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tier</th>
                        <th>Limit</th>
                        <th>Applies to</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                            Write
                          </span>
                        </td>
                        <td style={{ fontSize: "12px" }}>60 req/min</td>
                        <td style={{ fontSize: "12px" }}>POST, PATCH, PUT, DELETE</td>
                      </tr>
                      <tr>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                            Read
                          </span>
                        </td>
                        <td style={{ fontSize: "12px" }}>120 req/min</td>
                        <td style={{ fontSize: "12px" }}>GET</td>
                      </tr>
                      <tr>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                            Public
                          </span>
                        </td>
                        <td style={{ fontSize: "12px" }}>30 req/min</td>
                        <td style={{ fontSize: "12px" }}>Unauthenticated</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--color-border)",
              margin: "48px 0",
            }}
          />

          {/* -- EVENTS -- */}
          <section id="events" style={{ scrollMarginTop: "80px" }}>
            <h2>Events</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "32px",
                maxWidth: "560px",
              }}
            >
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
                  description: "The event name mapped to a workflow.",
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
                  description: "Batch-level idempotency key (24h window).",
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

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--color-border)",
              margin: "48px 0",
            }}
          />

          {/* -- SUBSCRIBERS -- */}
          <section id="subscribers" style={{ scrollMarginTop: "80px" }}>
            <h2>Subscribers</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "32px",
                maxWidth: "560px",
              }}
            >
              Manage the users who receive notifications. Each subscriber is
              identified by a unique{" "}
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  background: "var(--color-elevated)",
                  borderRadius: "4px",
                  padding: "1px 4px",
                  color: "var(--color-text-secondary)",
                }}
              >
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

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--color-border)",
              margin: "48px 0",
            }}
          />

          {/* -- NOTIFICATIONS -- */}
          <section id="notifications" style={{ scrollMarginTop: "80px" }}>
            <h2>Notifications</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "32px",
                maxWidth: "560px",
              }}
            >
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

          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--color-border)",
              margin: "48px 0",
            }}
          />

          {/* -- WEBSOCKET -- */}
          <section id="websocket" style={{ scrollMarginTop: "80px" }}>
            <h2>WebSocket</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                marginBottom: "32px",
                maxWidth: "560px",
              }}
            >
              Receive real-time in-app notifications over a persistent WebSocket
              connection. Authenticate using a subscriber-scoped JWT.
            </p>

            <div
              style={{
                maxWidth: "640px",
                display: "flex",
                flexDirection: "column",
                gap: "32px",
              }}
            >
              {/* Connection info */}
              <div>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Connection
                </h4>
                <div style={{ marginBottom: "16px" }}>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    Endpoint
                  </p>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      color: "var(--color-text-primary)",
                      background: "var(--color-elevated)",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      display: "block",
                    }}
                  >
                    wss://api.alrt.dev/ws?token=&lt;jwt&gt;
                  </code>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Obtain a JWT via{" "}
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      background: "var(--color-elevated)",
                      borderRadius: "4px",
                      padding: "1px 4px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    POST /subscribers/{"{external_id}"}/token
                  </code>{" "}
                  using your server key. Pass the token as the{" "}
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      background: "var(--color-elevated)",
                      borderRadius: "4px",
                      padding: "1px 4px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    token
                  </code>{" "}
                  query parameter. Tokens expire after 24 hours.
                </p>
              </div>

              {/* Client messages */}
              <div>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Client messages
                </h4>
                <div className="table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "120px" }}>Type</th>
                        <th style={{ width: "120px" }}>Payload</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                            ping
                          </code>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>&mdash;</td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          Server responds with{" "}
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", background: "var(--color-elevated)", borderRadius: "4px", padding: "1px 4px" }}>
                            pong
                          </code>
                          . Use as a keep-alive.
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                            mark_read
                          </code>
                        </td>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-muted)" }}>
                            notification_id
                          </code>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          Mark a single notification as read.
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                            mark_all_read
                          </code>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>&mdash;</td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          Mark all notifications as read.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Server messages */}
              <div>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Server messages
                </h4>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    marginBottom: "12px",
                  }}
                >
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
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Error codes
                </h4>
                <div className="table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>Code</th>
                        <th>Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "#f87171" }}>
                            4001
                          </code>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          Invalid or expired JWT. Re-fetch a token and reconnect.
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "#f87171" }}>
                            4000
                          </code>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                          Connection replaced. A new WebSocket connection was opened for the same subscriber.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example */}
              <div>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Example client
                </h4>
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
          <div style={{ height: "128px" }} />
        </main>
      </div>
    </div>
  );
}
