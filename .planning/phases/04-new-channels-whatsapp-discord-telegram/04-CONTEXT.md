# Phase 4: New Channels — WhatsApp, Discord, Telegram - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand from 3 channels (in-app, email, Slack) to 6 by adding WhatsApp (Meta Cloud API), Discord (webhooks), and Telegram (Bot API) as delivery channels. All three use alrt-hosted credentials by default — zero setup for startups. Includes backend workers, subscriber model extensions, workflow builder UI updates, and provider configuration pages.

</domain>

<decisions>
## Implementation Decisions

### WhatsApp Message Configuration
- Freeform message body with template fallback — user writes message freely; alrt sends as session message if within 24h window, otherwise requires a pre-approved Meta template name
- Plain text editor with `{{variable}}` interpolation — no rich text editor; matches WhatsApp's actual rendering
- When outside 24h window and no template set: queue message in pending state, dashboard shows "Template required" warning, dev can attach template name and retry
- No phone mockup preview — just the editor + variable picker; keep it simple for API-first product
- Webhook endpoint for delivery status — alrt exposes `/webhooks/whatsapp` for Meta to post sent/delivered/read/failed status updates
- Full media support from day one — images, documents, and video
- Media attachment: support both file upload (to blob storage) and external URL reference
- Template variable mapping: name-based auto-map — template variables use `{{name}}` syntax, alrt auto-maps from payload fields by matching names

### Discord Embed Builder
- Embed richness: Claude's discretion — pick what best covers notification use cases
- Webhook scope: team-level default + subscriber-level override — `discord_webhook_url` on team as default, subscriber can override with their own
- `{{variable}}` interpolation in body and embed fields — consistent with all other channels
- File attachments supported — assumes blob storage integration available
- Embed color: hex code input field — developer enters preferred hex color
- Discord mention syntax (`<@user_id>`, `<@&role_id>`) passed through — optional, developer includes in body if needed
- Setup guide in provider page: Claude's discretion on whether link-to-docs or step-by-step inline

### Channel Picker UX (Workflow Builder)
- Icon grid layout (3x2) in the node palette — all 6 channels as draggable icons
- Click-to-open config panel — node appears on canvas, user clicks to configure; consistent with existing behavior
- Unconfigured channels: greyed out with "Set up in Settings" tooltip — can't be added to workflow until provider is configured
- Node style: same card style for all channels, differentiated by per-channel brand icons (use an icon pack for official channel logos — Slack, WhatsApp, Discord, Telegram, email, in-app)
- Parallel execution — multiple channel nodes fire simultaneously (existing behavior maintained)
- No subscriber field availability indicator — if subscriber lacks required field (phone_number, telegram_chat_id), delivery fails gracefully and shows in DLQ
- Shared config panel layout — common wrapper (channel label, template selector) with channel-specific section below for unique fields

### Provider Setup Flow (Settings Page)
- Card grid layout — each channel as a card with icon, name, status badge (connected/not set up), and configure button
- WhatsApp: opt-in toggle — card shows "Available" with toggle to enable; team explicitly activates WhatsApp channel
- Telegram: auto-detect via bot — after team adds @alrt_bot to their group/chat, alrt auto-detects the chat and shows it in dashboard for confirmation
- Discord: webhook URL input (setup guide approach at Claude's discretion)
- Setup-focused only — no usage stats on provider cards; stats live on the analytics page
- BYOC options deferred to Phase 5 — this phase only shows alrt-hosted provider setup

### Claude's Discretion
- Discord embed field selection (title/description/color minimum, additional fields like footer/thumbnail/fields TBD)
- Discord provider setup guide style (link-to-docs vs step-by-step inline)
- Icon pack selection for channel brand icons
- Telegram bot name and interaction flow details
- In-app notification channel icon choice
- Exact config panel section ordering and field grouping

</decisions>

<specifics>
## Specific Ideas

- Channel node icons should use official brand icons (Slack logo, WhatsApp logo, etc.) — "like slack for slack, teams for teams, maybe use some icon pack"
- Blob storage integration is assumed available for media uploads (WhatsApp media + Discord attachments)
- WhatsApp template variables use the same `{{name}}` pattern as other channels for consistency across the platform
- Discord mentions are developer-controlled — alrt just passes the mention syntax through, doesn't provide a mention picker

</specifics>

<deferred>
## Deferred Ideas

- BYOC credentials for WhatsApp/Telegram — Phase 5 (White-Label & Pricing)
- Per-channel usage stats on provider cards — could be added to analytics page enhancement
- WhatsApp phone mockup preview — could be added as a UX polish item later
- Rich text editing for WhatsApp (bold/italic/strikethrough) — future enhancement if users request

</deferred>

---

*Phase: 04-new-channels-whatsapp-discord-telegram*
*Context gathered: 2026-03-06*
