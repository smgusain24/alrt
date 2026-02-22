"use client";

import { DocsSidebar, EndpointBlock } from "@/components/docs";
import {
  WindowCard,
  GrooveDivider,
  CodeBlock,
  RetroLink,
  Badge,
} from "@/components/retro";

const SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "authentication", label: "Authentication" },
  { id: "events", label: "Events" },
  { id: "subscribers", label: "Subscribers" },
  { id: "notifications", label: "Notifications" },
  { id: "workflows", label: "Workflows" },
  { id: "providers", label: "Providers" },
  { id: "websocket", label: "WebSocket" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="bg-white border-b-2 border-muted px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-heading text-2xl">ALRT</span>
            <span className="font-mono text-sm text-muted">.dev</span>
            <span className="text-muted mx-2">/</span>
            <span className="font-heading text-sm uppercase">API Docs</span>
          </div>
          <div className="flex items-center gap-4">
            <RetroLink href="/">Home</RetroLink>
            <RetroLink href="/workflows">Dashboard</RetroLink>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <div className="hidden md:block w-56 shrink-0 sticky top-0 h-screen overflow-y-auto py-4 pr-4">
          <DocsSidebar sections={SECTIONS} />
        </div>

        {/* Content */}
        <main className="flex-1 py-8 px-4 md:px-8 min-w-0">
          {/* ───────────────── GETTING STARTED ───────────────── */}
          <section id="getting-started">
            <h1 className="font-heading text-3xl mb-2">API Reference</h1>
            <p className="text-sm text-muted mb-6">
              Base URL:{" "}
              <code className="font-mono bg-muted/20 px-1.5 py-0.5">
                https://api.alrt.dev
              </code>
            </p>

            <h2 className="font-heading text-xl mb-4">Quick Start</h2>
            <p className="text-sm text-foreground mb-4">
              Get up and running in three steps. Every request uses your server
              key as a Bearer token.
            </p>

            <div className="space-y-4">
              <WindowCard title="Step 1 — Create a Team">
                <p className="text-sm mb-3">
                  Create a team to get your API keys. The response includes your{" "}
                  <code className="font-mono text-xs bg-muted/20 px-1">
                    raw_key
                  </code>{" "}
                  (shown only once).
                </p>
                <CodeBlock
                  title="Request"
                  code={`curl -X POST https://api.alrt.dev/teams \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My App"}'`}
                />
              </WindowCard>

              <WindowCard title="Step 2 — Create a Subscriber">
                <p className="text-sm mb-3">
                  Register a user who will receive notifications.
                </p>
                <CodeBlock
                  title="Request"
                  code={`curl -X POST https://api.alrt.dev/subscribers \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"external_id": "user_1", "email": "jane@example.com"}'`}
                />
              </WindowCard>

              <WindowCard title="Step 3 — Trigger a Notification">
                <p className="text-sm mb-3">
                  Fire an event that triggers a workflow and delivers
                  notifications.
                </p>
                <CodeBlock
                  title="Request"
                  code={`curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "welcome",
    "subscriber_id": "user_1",
    "payload": {"name": "Jane"}
  }'`}
                />
              </WindowCard>
            </div>
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── AUTHENTICATION ───────────────── */}
          <section id="authentication">
            <h2 className="font-heading text-xl mb-4">Authentication</h2>
            <p className="text-sm text-foreground mb-4">
              All API requests require a Bearer token in the{" "}
              <code className="font-mono text-xs bg-muted/20 px-1">
                Authorization
              </code>{" "}
              header:
            </p>
            <CodeBlock
              title="Header"
              code={`Authorization: Bearer alrt_sk_live_abc123...`}
            />

            <div className="mt-6">
              <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
                Key Types
              </h3>
              <div className="bevel-inset bg-white p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-muted">
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Prefix
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Type
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Access
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-muted/50">
                      <td className="py-2 font-mono text-xs">
                        <Badge variant="success">alrt_sk_</Badge>
                      </td>
                      <td className="py-2">Server Key</td>
                      <td className="py-2">Full access (read + write)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-xs">
                        <Badge variant="warning">alrt_ck_</Badge>
                      </td>
                      <td className="py-2">Client Key</td>
                      <td className="py-2">
                        Read-only (frontend / WebSocket)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
                Rate Limits
              </h3>
              <div className="bevel-inset bg-white p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-muted">
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Tier
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Limit
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Applies To
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-muted/50">
                      <td className="py-2 font-mono text-xs">Write</td>
                      <td className="py-2">60 req/min</td>
                      <td className="py-2">POST, PATCH, PUT, DELETE</td>
                    </tr>
                    <tr className="border-b border-muted/50">
                      <td className="py-2 font-mono text-xs">Read</td>
                      <td className="py-2">120 req/min</td>
                      <td className="py-2">GET</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-xs">Public</td>
                      <td className="py-2">30 req/min</td>
                      <td className="py-2">Unauthenticated endpoints</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── EVENTS ───────────────── */}
          <section id="events">
            <h2 className="font-heading text-xl mb-4">Events</h2>
            <p className="text-sm text-foreground mb-6">
              Trigger workflow execution by firing named events. Each event name
              maps to exactly one workflow.
            </p>

            <EndpointBlock
              method="POST"
              path="/events/trigger"
              description="Trigger a workflow by event name. The matched workflow will execute asynchronously and deliver to all configured channels."
              bodyParams={[
                {
                  name: "workflow",
                  type: "string",
                  required: true,
                  description:
                    "The event name mapped to a workflow (e.g. 'welcome', 'invoice.paid').",
                },
                {
                  name: "subscriber_id",
                  type: "string",
                  required: true,
                  description:
                    "The external_id of the subscriber to notify.",
                },
                {
                  name: "channels",
                  type: "string[]",
                  required: false,
                  description:
                    'Optional channel override. Values: "in_app", "email", "slack". If omitted, uses workflow definition.',
                },
                {
                  name: "payload",
                  type: "object",
                  required: false,
                  default: "{}",
                  description:
                    "Key-value data passed to templates for variable substitution.",
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
    "subscriber_id": "user_1",
    "channels": ["in_app", "email"],
    "payload": {"name": "Jane", "plan": "Pro"},
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
                  detail: "Workflow not found for event name.",
                },
                {
                  status: "404",
                  detail: "Subscriber not found.",
                },
              ]}
            />
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── SUBSCRIBERS ───────────────── */}
          <section id="subscribers">
            <h2 className="font-heading text-xl mb-4">Subscribers</h2>
            <p className="text-sm text-foreground mb-6">
              Manage the users who receive notifications. Each subscriber is
              identified by a unique{" "}
              <code className="font-mono text-xs bg-muted/20 px-1">
                external_id
              </code>{" "}
              that you define.
            </p>

            {/* POST /subscribers */}
            <EndpointBlock
              method="POST"
              path="/subscribers"
              description="Create a new subscriber. The external_id must be unique within your team."
              bodyParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description:
                    "Your application's unique user identifier.",
                },
                {
                  name: "email",
                  type: "string",
                  required: false,
                  description: "Email address for the email channel.",
                },
                {
                  name: "name",
                  type: "string",
                  required: false,
                  description: "Display name used in templates.",
                },
                {
                  name: "slack_user_id",
                  type: "string",
                  required: false,
                  description:
                    "Slack member ID for the Slack channel.",
                },
                {
                  name: "custom_properties",
                  type: "object",
                  required: false,
                  description:
                    "Arbitrary key-value metadata for template rendering.",
                },
                {
                  name: "channel_preferences",
                  type: "object",
                  required: false,
                  description:
                    'Per-channel opt-in/out. E.g. {"email": true, "in_app": true, "slack": false}.',
                },
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
  "slack_user_id": null,
  "custom_properties": {},
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": false
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}`}
              responseStatus="201 Created"
              errors={[
                {
                  status: "409",
                  detail: "Subscriber with this external_id already exists.",
                },
              ]}
            />

            {/* GET /subscribers/{external_id} */}
            <EndpointBlock
              method="GET"
              path="/subscribers/{external_id}"
              description="Retrieve a single subscriber by their external_id."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              requestExample={`curl https://api.alrt.dev/subscribers/user_1 \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "id": "sub_01HX...",
  "external_id": "user_1",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "slack_user_id": null,
  "custom_properties": {},
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": false
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}`}
              responseStatus="200 OK"
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />

            {/* PATCH /subscribers/{external_id} */}
            <EndpointBlock
              method="PATCH"
              path="/subscribers/{external_id}"
              description="Update subscriber fields. Only provided fields are changed."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              bodyParams={[
                {
                  name: "email",
                  type: "string",
                  required: false,
                  description: "Updated email address.",
                },
                {
                  name: "name",
                  type: "string",
                  required: false,
                  description: "Updated display name.",
                },
                {
                  name: "slack_user_id",
                  type: "string",
                  required: false,
                  description: "Updated Slack member ID.",
                },
                {
                  name: "custom_properties",
                  type: "object",
                  required: false,
                  description: "Merged with existing custom properties.",
                },
                {
                  name: "channel_preferences",
                  type: "object",
                  required: false,
                  description: "Updated channel preferences.",
                },
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
  "slack_user_id": null,
  "custom_properties": {},
  "channel_preferences": {
    "email": true,
    "in_app": true,
    "slack": false
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T12:00:00Z"
}`}
              responseStatus="200 OK"
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />

            {/* DELETE /subscribers/{external_id} */}
            <EndpointBlock
              method="DELETE"
              path="/subscribers/{external_id}"
              description="Permanently delete a subscriber and all their notifications."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              requestExample={`curl -X DELETE https://api.alrt.dev/subscribers/user_1 \\
  -H "Authorization: Bearer $KEY"`}
              responseStatus="204 No Content"
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />

            {/* GET /subscribers/{external_id}/preferences */}
            <EndpointBlock
              method="GET"
              path="/subscribers/{external_id}/preferences"
              description="Retrieve a subscriber's per-channel notification preferences."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
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
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />

            {/* PATCH /subscribers/{external_id}/preferences */}
            <EndpointBlock
              method="PATCH"
              path="/subscribers/{external_id}/preferences"
              description="Replace a subscriber's channel preferences entirely. This is a full replacement, not a merge."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              bodyParams={[
                {
                  name: "channel_preferences",
                  type: "object",
                  required: true,
                  description:
                    'Full replacement of channel preferences. E.g. {"email": true, "in_app": true, "slack": true}.',
                },
              ]}
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
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />

            {/* POST /subscribers/{external_id}/token */}
            <EndpointBlock
              method="POST"
              path="/subscribers/{external_id}/token"
              description="Generate a short-lived JWT for WebSocket authentication. The token expires after 24 hours."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/subscribers/user_1/token \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}`}
              responseStatus="200 OK"
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── NOTIFICATIONS ───────────────── */}
          <section id="notifications">
            <h2 className="font-heading text-xl mb-4">Notifications</h2>
            <p className="text-sm text-foreground mb-6">
              Query and manage a subscriber&apos;s in-app notification feed.
            </p>

            {/* GET /subscribers/{external_id}/notifications */}
            <EndpointBlock
              method="GET"
              path="/subscribers/{external_id}/notifications"
              description="List notifications for a subscriber with filtering and pagination."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              queryParams={[
                {
                  name: "channel",
                  type: "string",
                  required: false,
                  description:
                    'Filter by channel: "in_app", "email", or "slack".',
                },
                {
                  name: "is_read",
                  type: "boolean",
                  required: false,
                  description: "Filter by read status.",
                },
                {
                  name: "limit",
                  type: "integer",
                  required: false,
                  default: "20",
                  description: "Number of results to return. Max 100.",
                },
                {
                  name: "offset",
                  type: "integer",
                  required: false,
                  default: "0",
                  description: "Number of results to skip.",
                },
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
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />

            {/* PATCH /subscribers/{external_id}/notifications/{notification_id} */}
            <EndpointBlock
              method="PATCH"
              path="/subscribers/{external_id}/notifications/{notification_id}"
              description="Update a single notification's read or archived status."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
                {
                  name: "notification_id",
                  type: "string",
                  required: true,
                  description: "The notification ID.",
                },
              ]}
              bodyParams={[
                {
                  name: "is_read",
                  type: "boolean",
                  required: false,
                  description: "Mark as read or unread.",
                },
                {
                  name: "is_archived",
                  type: "boolean",
                  required: false,
                  description: "Mark as archived or unarchived.",
                },
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
              errors={[
                { status: "404", detail: "Notification not found." },
              ]}
            />

            {/* POST /subscribers/{external_id}/notifications/mark-all-read */}
            <EndpointBlock
              method="POST"
              path="/subscribers/{external_id}/notifications/mark-all-read"
              description="Mark all of a subscriber's notifications as read in one batch."
              pathParams={[
                {
                  name: "external_id",
                  type: "string",
                  required: true,
                  description: "The subscriber's unique identifier.",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/subscribers/user_1/notifications/mark-all-read \\
  -H "Authorization: Bearer $KEY"`}
              responseStatus="204 No Content"
              errors={[
                { status: "404", detail: "Subscriber not found." },
              ]}
            />
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── WORKFLOWS ───────────────── */}
          <section id="workflows">
            <h2 className="font-heading text-xl mb-4">Workflows</h2>
            <p className="text-sm text-foreground mb-6">
              Create and manage notification workflows. Each workflow is
              triggered by a unique event name and defines a sequence of
              notification steps.
            </p>

            {/* POST /workflows */}
            <EndpointBlock
              method="POST"
              path="/workflows"
              description="Create a new workflow. The event_name must be unique within your team."
              bodyParams={[
                {
                  name: "name",
                  type: "string",
                  required: true,
                  description:
                    "Human-readable name for the workflow.",
                },
                {
                  name: "event_name",
                  type: "string",
                  required: true,
                  description:
                    "Unique event name that triggers this workflow.",
                },
                {
                  name: "definition",
                  type: "object",
                  required: false,
                  description:
                    "Workflow definition (nodes and edges from the visual builder).",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/workflows \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Welcome Flow",
    "event_name": "welcome",
    "definition": {}
  }'`}
              responseExample={`{
  "id": "wf_01HX...",
  "name": "Welcome Flow",
  "event_name": "welcome",
  "definition": {},
  "status": "draft",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}`}
              responseStatus="201 Created"
              errors={[
                {
                  status: "409",
                  detail:
                    "A workflow with this event_name already exists.",
                },
              ]}
            />

            {/* GET /workflows */}
            <EndpointBlock
              method="GET"
              path="/workflows"
              description="List all workflows for the current team."
              requestExample={`curl https://api.alrt.dev/workflows \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`[
  {
    "id": "wf_01HX...",
    "name": "Welcome Flow",
    "event_name": "welcome",
    "status": "published",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T12:00:00Z"
  }
]`}
              responseStatus="200 OK"
            />

            {/* GET /workflows/{workflow_id} */}
            <EndpointBlock
              method="GET"
              path="/workflows/{workflow_id}"
              description="Retrieve a single workflow including its full definition."
              pathParams={[
                {
                  name: "workflow_id",
                  type: "string",
                  required: true,
                  description: "The workflow ID.",
                },
              ]}
              requestExample={`curl https://api.alrt.dev/workflows/wf_01HX \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "id": "wf_01HX...",
  "name": "Welcome Flow",
  "event_name": "welcome",
  "definition": {
    "nodes": [...],
    "edges": [...]
  },
  "status": "published",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T12:00:00Z"
}`}
              responseStatus="200 OK"
              errors={[
                { status: "404", detail: "Workflow not found." },
              ]}
            />

            {/* PUT /workflows/{workflow_id} */}
            <EndpointBlock
              method="PUT"
              path="/workflows/{workflow_id}"
              description="Update a workflow's name, event_name, or definition. Published workflows cannot be edited — create a new version instead."
              pathParams={[
                {
                  name: "workflow_id",
                  type: "string",
                  required: true,
                  description: "The workflow ID.",
                },
              ]}
              bodyParams={[
                {
                  name: "name",
                  type: "string",
                  required: false,
                  description: "Updated workflow name.",
                },
                {
                  name: "event_name",
                  type: "string",
                  required: false,
                  description: "Updated event name.",
                },
                {
                  name: "definition",
                  type: "object",
                  required: false,
                  description: "Updated workflow definition.",
                },
              ]}
              requestExample={`curl -X PUT https://api.alrt.dev/workflows/wf_01HX \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Welcome Flow v2",
    "definition": {
      "nodes": [...],
      "edges": [...]
    }
  }'`}
              responseExample={`{
  "id": "wf_01HX...",
  "name": "Welcome Flow v2",
  "event_name": "welcome",
  "definition": {
    "nodes": [...],
    "edges": [...]
  },
  "status": "draft",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T14:00:00Z"
}`}
              responseStatus="200 OK"
              errors={[
                {
                  status: "400",
                  detail:
                    "Cannot edit a published workflow.",
                },
                { status: "404", detail: "Workflow not found." },
              ]}
            />

            {/* POST /workflows/{workflow_id}/publish */}
            <EndpointBlock
              method="POST"
              path="/workflows/{workflow_id}/publish"
              description="Validate and publish a workflow. The definition must contain a trigger node and no more than 10 steps."
              pathParams={[
                {
                  name: "workflow_id",
                  type: "string",
                  required: true,
                  description: "The workflow ID.",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/workflows/wf_01HX/publish \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`{
  "id": "wf_01HX...",
  "name": "Welcome Flow",
  "event_name": "welcome",
  "status": "published",
  "published_at": "2025-01-15T14:05:00Z"
}`}
              responseStatus="200 OK"
              errors={[
                {
                  status: "400",
                  detail: "Workflow has no nodes.",
                },
                {
                  status: "400",
                  detail: "Workflow must have a trigger node.",
                },
                {
                  status: "400",
                  detail:
                    "Workflow exceeds maximum of 10 steps.",
                },
                { status: "404", detail: "Workflow not found." },
              ]}
            />

            {/* DELETE /workflows/{workflow_id} */}
            <EndpointBlock
              method="DELETE"
              path="/workflows/{workflow_id}"
              description="Permanently delete a workflow."
              pathParams={[
                {
                  name: "workflow_id",
                  type: "string",
                  required: true,
                  description: "The workflow ID.",
                },
              ]}
              requestExample={`curl -X DELETE https://api.alrt.dev/workflows/wf_01HX \\
  -H "Authorization: Bearer $KEY"`}
              responseStatus="204 No Content"
              errors={[
                { status: "404", detail: "Workflow not found." },
              ]}
            />
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── PROVIDERS ───────────────── */}
          <section id="providers">
            <h2 className="font-heading text-xl mb-4">Providers</h2>
            <p className="text-sm text-foreground mb-6">
              Configure delivery providers for each channel (e.g. SendGrid for
              email, Slack API for Slack). Provider config is encrypted at rest
              and never returned in API responses.
            </p>

            {/* POST /providers */}
            <EndpointBlock
              method="POST"
              path="/providers"
              description="Add a new delivery provider. The config object is encrypted and will not be returned in any response."
              bodyParams={[
                {
                  name: "channel",
                  type: "string",
                  required: true,
                  description:
                    'The channel this provider serves: "email", "slack", or "in_app".',
                },
                {
                  name: "provider_type",
                  type: "string",
                  required: true,
                  description:
                    'Provider identifier (e.g. "sendgrid", "ses", "resend", "slack").',
                },
                {
                  name: "config",
                  type: "object",
                  required: true,
                  description:
                    "Provider-specific configuration (API keys, tokens, etc). Encrypted at rest.",
                },
              ]}
              requestExample={`curl -X POST https://api.alrt.dev/providers \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "email",
    "provider_type": "sendgrid",
    "config": {
      "api_key": "SG.xxxx...",
      "from_email": "noreply@myapp.com",
      "from_name": "My App"
    }
  }'`}
              responseExample={`{
  "id": "prv_01HX...",
  "channel": "email",
  "provider_type": "sendgrid",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z"
}`}
              responseStatus="201 Created"
            />

            {/* GET /providers */}
            <EndpointBlock
              method="GET"
              path="/providers"
              description="List all configured providers. Config objects are never included in the response."
              requestExample={`curl https://api.alrt.dev/providers \\
  -H "Authorization: Bearer $KEY"`}
              responseExample={`[
  {
    "id": "prv_01HX...",
    "channel": "email",
    "provider_type": "sendgrid",
    "is_active": true,
    "created_at": "2025-01-15T10:30:00Z"
  },
  {
    "id": "prv_02HX...",
    "channel": "slack",
    "provider_type": "slack",
    "is_active": true,
    "created_at": "2025-01-16T09:00:00Z"
  }
]`}
              responseStatus="200 OK"
            />

            {/* DELETE /providers/{provider_id} */}
            <EndpointBlock
              method="DELETE"
              path="/providers/{provider_id}"
              description="Remove a delivery provider."
              pathParams={[
                {
                  name: "provider_id",
                  type: "string",
                  required: true,
                  description: "The provider ID.",
                },
              ]}
              requestExample={`curl -X DELETE https://api.alrt.dev/providers/prv_01HX \\
  -H "Authorization: Bearer $KEY"`}
              responseStatus="204 No Content"
              errors={[
                { status: "404", detail: "Provider not found." },
              ]}
            />
          </section>

          <GrooveDivider className="my-8" />

          {/* ───────────────── WEBSOCKET ───────────────── */}
          <section id="websocket">
            <h2 className="font-heading text-xl mb-4">WebSocket</h2>
            <p className="text-sm text-foreground mb-6">
              Receive real-time in-app notifications over a persistent WebSocket
              connection. Authenticate using a subscriber-scoped JWT.
            </p>

            <WindowCard title="Connection">
              <div className="space-y-3">
                <div>
                  <h4 className="font-heading text-xs uppercase tracking-wide mb-2">
                    Endpoint
                  </h4>
                  <code className="font-mono text-sm bg-muted/20 px-2 py-1 block">
                    ws://api.alrt.dev/ws?token=&lt;jwt&gt;
                  </code>
                </div>
                <div>
                  <h4 className="font-heading text-xs uppercase tracking-wide mb-2">
                    Authentication
                  </h4>
                  <p className="text-sm text-foreground">
                    Obtain a JWT via{" "}
                    <code className="font-mono text-xs bg-muted/20 px-1">
                      POST /subscribers/{"{external_id}"}/token
                    </code>{" "}
                    using your server key. Pass the token as the{" "}
                    <code className="font-mono text-xs bg-muted/20 px-1">
                      token
                    </code>{" "}
                    query parameter. Tokens expire after 24 hours.
                  </p>
                </div>
              </div>
            </WindowCard>

            <div className="mt-6">
              <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
                Client Messages
              </h3>
              <div className="bevel-inset bg-white p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-muted">
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Type
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Payload
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-muted/50">
                      <td className="py-2 font-mono text-xs">ping</td>
                      <td className="py-2 font-mono text-xs">&mdash;</td>
                      <td className="py-2">
                        Server responds with{" "}
                        <code className="font-mono text-xs bg-muted/20 px-1">
                          pong
                        </code>
                        . Use as a keep-alive.
                      </td>
                    </tr>
                    <tr className="border-b border-muted/50">
                      <td className="py-2 font-mono text-xs">mark_read</td>
                      <td className="py-2 font-mono text-xs">
                        notification_id
                      </td>
                      <td className="py-2">
                        Mark a single notification as read.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-xs">mark_all_read</td>
                      <td className="py-2 font-mono text-xs">&mdash;</td>
                      <td className="py-2">
                        Mark all notifications as read.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
                Server Messages
              </h3>
              <p className="text-sm text-foreground mb-3">
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

            <div className="mt-6">
              <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
                Error Codes
              </h3>
              <div className="bevel-inset bg-white p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-muted">
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Code
                      </th>
                      <th className="text-left py-2 font-heading text-xs uppercase">
                        Meaning
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-muted/50">
                      <td className="py-2 font-mono text-xs font-bold text-danger">
                        4001
                      </td>
                      <td className="py-2">
                        Invalid or expired JWT. Re-fetch a token and reconnect.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-xs font-bold text-danger">
                        4000
                      </td>
                      <td className="py-2">
                        Connection replaced. A new WebSocket connection was
                        opened for the same subscriber, so this one was closed.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
                Example Client
              </h3>
              <CodeBlock
                title="websocket-client.ts"
                code={`const token = await fetch("/api/ws-token").then(r => r.json());
const ws = new WebSocket("ws://api.alrt.dev/ws?token=" + token);

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
          </section>

          {/* Bottom spacer */}
          <div className="h-32" />
        </main>
      </div>
    </div>
  );
}
