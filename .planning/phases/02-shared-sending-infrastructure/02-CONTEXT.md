# Phase 2: Shared Sending Infrastructure - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

alrt becomes the sending infrastructure for email and Slack. New teams get both channels working out of the box — no Resend account, no Slack app registration required. Deliverables: alrt-hosted Resend for email, alrt's OAuth Slack app, per-team sending quotas, provider model update (`alrt_hosted` type), dashboard Settings > Channels page. White-label/custom domains are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Slack OAuth Flow
- OAuth entry point: **Settings > Channels** page
- Post-OAuth: zero additional configuration required — workspace is connected and ready
- Connected state display: workspace name + disconnect button
- On disconnection (token revoked / app uninstalled): mark Slack as disconnected silently; Slack deliveries are skipped (other channels unaffected); dashboard shows "Disconnected" state on Channels page

### Provider Model
- New teams land on Settings > Channels with Email and Slack pre-shown as **"Ready via alrt"** — no setup required
- BYOC email credentials are **not available at this tier** — alrt-hosted only; BYOC is a Phase 4 white-label feature
- No migration required — no existing users with BYOC configuration at launch

### Sending Quotas
- Quota period: **monthly, resets on calendar month start**
- Quota pool: **shared across all channels** (email + Slack combined)
- Default quota: **1,000 notifications/month** per team
- Enforcement: **soft limit** — continue delivering when over limit, flag team in DB
- Over-limit visibility: DB flag + **generic warning banner** at top of dashboard (across all pages while over limit)
- Banner copy: generic "You've exceeded your monthly notification limit" — no usage count shown

### Email From-Address
- Default sending address: **noreply@alrt.dev** (alrt's Resend account)
- Display name: teams can set a custom display name in settings (e.g. "Acme App")
- Default display name fallback: **team name from signup** (e.g. "Acme Inc <noreply@alrt.dev>")
- From-address is **team-level only** — no per-workflow/per-notification override at this tier
- Per-notification from-address override is Phase 4 white-label territory

### Claude's Discretion
- Specific DB schema for quota tracking (column names, table choice)
- How `alrt_hosted` provider type is stored vs BYOC (new row type, flag, or separate table)
- Exact Resend API integration details (API key management, error handling)
- Dashboard UI layout for Settings > Channels (deferred to UI overhaul phase)

</decisions>

<specifics>
## Specific Ideas

- Settings > Channels page deferred to UI overhaul — backend and API surface are in scope for this phase; the exact frontend page layout is not locked yet
- No existing users to migrate — alrt_hosted becomes the default for all new teams from this phase forward

</specifics>

<deferred>
## Deferred Ideas

- Settings > Channels page visual design / layout — deferred to a planned UI overhaul phase
- BYOC email credentials override — Phase 4 white-label feature
- Custom sending domain (DKIM/SPF verification) — Phase 4
- Per-notification from-address override — Phase 4
- Quota usage counter visible to teams in dashboard — future billing/settings work
- Hard quota enforcement (429 on breach) — can be promoted in Phase 4 with pricing tiers

</deferred>

---

*Phase: 02-shared-sending-infrastructure*
*Context gathered: 2026-02-28*
