# Phase 2: Shared Sending Infrastructure - Research

**Researched:** 2026-02-28
**Domain:** Email delivery (Resend API), Slack OAuth v2, per-team quota tracking, provider model evolution
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Slack OAuth Flow**
- OAuth entry point: Settings > Channels page
- Post-OAuth: zero additional configuration required — workspace is connected and ready
- Connected state display: workspace name + disconnect button
- On disconnection (token revoked / app uninstalled): mark Slack as disconnected silently; Slack deliveries are skipped (other channels unaffected); dashboard shows "Disconnected" state on Channels page

**Provider Model**
- New teams land on Settings > Channels with Email and Slack pre-shown as "Ready via alrt" — no setup required
- BYOC email credentials are not available at this tier — alrt-hosted only; BYOC is a Phase 4 white-label feature
- No migration required — no existing users with BYOC configuration at launch

**Sending Quotas**
- Quota period: monthly, resets on calendar month start
- Quota pool: shared across all channels (email + Slack combined)
- Default quota: 1,000 notifications/month per team
- Enforcement: soft limit — continue delivering when over limit, flag team in DB
- Over-limit visibility: DB flag + generic warning banner at top of dashboard (across all pages while over limit)
- Banner copy: generic "You've exceeded your monthly notification limit" — no usage count shown

**Email From-Address**
- Default sending address: noreply@alrt.dev (alrt's Resend account)
- Display name: teams can set a custom display name in settings (e.g. "Acme App")
- Default display name fallback: team name from signup (e.g. "Acme Inc <noreply@alrt.dev>")
- From-address is team-level only — no per-workflow/per-notification override at this tier
- Per-notification from-address override is Phase 4 white-label territory

### Claude's Discretion
- Specific DB schema for quota tracking (column names, table choice)
- How `alrt_hosted` provider type is stored vs BYOC (new row type, flag, or separate table)
- Exact Resend API integration details (API key management, error handling)
- Dashboard UI layout for Settings > Channels (deferred to UI overhaul phase)

### Deferred Ideas (OUT OF SCOPE)
- Settings > Channels page visual design / layout — deferred to a planned UI overhaul phase
- BYOC email credentials override — Phase 4 white-label feature
- Custom sending domain (DKIM/SPF verification) — Phase 4
- Per-notification from-address override — Phase 4
- Quota usage counter visible to teams in dashboard — future billing/settings work
- Hard quota enforcement (429 on breach) — can be promoted in Phase 4 with pricing tiers
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Startup can trigger email delivery without providing their own SendGrid/Resend credentials (alrt uses its own shared sending account) | Resend API with alrt's own key stored in env; `alrt_hosted` provider auto-inserted at team creation; email worker reads env key when provider_type = `alrt_hosted` |
| INFRA-02 | Startup can connect Slack workspace via alrt's OAuth app without registering their own Slack app | Existing Slack OAuth flow in providers.py already implements this; upgrade: rename route to `/channels`, add workspace name display, handle `tokens_revoked` event to mark disconnected |
| INFRA-03 | Each team's sending is quota-tracked to prevent abuse of shared infrastructure | New `team_quotas` table with monthly_count + over_limit flag; increment in Celery worker after each delivery; reset via cron or date-based check at query time |
</phase_requirements>

---

## Summary

Phase 2 transforms alrt from a BYOC (bring-your-own-credentials) platform into a true shared sending infrastructure. The three deliverables are: (1) alrt's own Resend account sends email for all teams via `noreply@alrt.dev`, (2) alrt's registered Slack app handles workspace OAuth for all teams, and (3) per-team monthly quotas are tracked and surfaced as a dashboard warning banner.

The codebase already has most of the infrastructure in place. The email worker (`channels/email.py`) already supports the `resend` provider type using httpx calls — the change is that instead of reading a per-team encrypted API key from the `providers` table, it reads alrt's own Resend API key from env when the provider is `alrt_hosted`. The Slack OAuth flow (`routes/providers.py`) is already fully implemented with the `slack_oauth` provider type, `SLACK_CLIENT_ID`/`SLACK_CLIENT_SECRET` env vars, and the OAuth code exchange — the change is handling the workspace name display and the `tokens_revoked` event from Slack's Events API.

The most novel work in this phase is: (1) auto-inserting `alrt_hosted` providers for new teams at signup, (2) the quota tracking table + increment logic in the Celery delivery tasks, and (3) the dashboard quota banner in the layout. The `providers` table's `provider_type` column already distinguishes `resend`, `sendgrid`, `slack_oauth` — adding `alrt_hosted` for both email and slack is a clean extension of existing patterns.

**Primary recommendation:** Extend the existing provider model with `provider_type = 'alrt_hosted'` for both channels; insert these rows at team creation; update both worker deliver() functions to branch on provider_type and use env-sourced API key for `alrt_hosted`; add quota tracking table with a counter increment and DB flag; add dashboard banner in `(dashboard)/layout.tsx`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | Already in workers | Resend API HTTP calls | Already used in email.py and slack.py; no new dep needed |
| asyncpg | Already in API | Quota table reads/writes | Project standard — raw SQL, no ORM |
| python-jose | Already in API | JWT decode in Slack OAuth state | Already used in providers.py |
| cryptography (Fernet) | Already in API + workers | Config encryption | Already used for all provider configs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| resend (pip) | Latest | Official Resend Python SDK | NOT needed — existing httpx implementation in email.py is sufficient and already works |
| slowapi | Already in API | Rate limiting on new API endpoints | Already applied to all routes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| httpx (Resend) | resend pip SDK | SDK adds clean interface but httpx is already working, tested, and in workers env; avoid new dep |
| DB flag on teams table | Separate quota table | Separate `team_quotas` table is cleaner — keeps teams table lean, makes quota resets trivial |
| Calendar month check at query time | Cron reset job | DB flag on `team_quotas` with `quota_period_start` column is simpler and self-contained — no Celery Beat job needed for reset |

**Installation:** No new packages required. Resend API is called via existing httpx. Slack OAuth is called via existing httpx. All dependencies already in place.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
apps/api/alrt/
├── routes/
│   ├── providers.py          # Rename to channels.py OR extend in-place
│   └── teams.py              # Add alrt_hosted provider auto-insert at signup
├── queries/
│   ├── providers.py          # Add alrt_hosted query helpers
│   └── quotas.py             # NEW: quota tracking queries
├── schemas/
│   └── provider.py           # Extend ProviderResponse with workspace_name field

apps/workers/alrt_workers/tasks/channels/
├── email.py                  # Branch on alrt_hosted provider_type
└── slack.py                  # Branch on alrt_hosted provider_type + skip if disconnected

schema.sql                    # ADD team_quotas table
```

### Pattern 1: alrt_hosted Provider Auto-Insert at Team Creation

**What:** When a new team is created at signup, immediately insert two `providers` rows: one for `email/alrt_hosted` and one for `slack/alrt_hosted` (the slack one starts with `is_active = false` until OAuth completes — or alternatively always active with a special flag for "pending connection").

**When to use:** In `routes/auth.py` signup handler, after team creation.

**Recommendation:** Insert the email `alrt_hosted` provider as `is_active = true` immediately (no setup needed — alrt's Resend key works). Insert the Slack `alrt_hosted` provider with `is_active = false` and `config = {}` as a placeholder — it becomes active after the OAuth flow stores the bot_token.

**Example:**
```python
# Source: pattern based on existing execute_insert_query usage in auth.py
# In signup handler, after team is created:
from alrt.queries import providers as prov_q
import uuid

# Auto-insert alrt-hosted email provider
await execute_insert_query(prov_q.CREATE_ALRT_HOSTED, [
    uuid.uuid4(), team_id, "email", "alrt_hosted",
    {"display_name": body.team_name},  # unencrypted — no secrets
    True,  # is_active
])

# Auto-insert alrt-hosted Slack provider placeholder (inactive until OAuth)
await execute_insert_query(prov_q.CREATE_ALRT_HOSTED, [
    uuid.uuid4(), team_id, "slack", "alrt_hosted",
    {"status": "pending"},
    False,  # is_active — activated after OAuth
])
```

### Pattern 2: Worker Branching on alrt_hosted vs BYOC

**What:** In `email.py` and `slack.py` deliver() tasks, branch on `provider["provider_type"]` to decide where to get credentials.

**When to use:** Both channel workers need this after the provider_type is extended.

**Example:**
```python
# Source: extension of existing pattern in email.py
provider = execute_read_one_query(Q_GET_EMAIL_PROVIDER, [uuid.UUID(team_id)])
if not provider:
    log.warning(f"No email provider for team {team_id}")
    return

if provider["provider_type"] == "alrt_hosted":
    # Use alrt's own Resend API key from environment
    import os
    api_key = os.getenv("RESEND_API_KEY")
    from_email = f"{config.get('display_name', 'alrt')} <noreply@alrt.dev>"
    # config is NOT encrypted for alrt_hosted (no secrets stored)
    config_data = provider["config"]
else:
    # BYOC: decrypt per-team credentials (legacy path, Phase 4)
    f = get_fernet()
    config_data = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))
    api_key = config_data["api_key"]
    from_email = config_data.get("from_email", "noreply@alrt.dev")
```

**Note:** The `config` field for `alrt_hosted` providers stores non-secret metadata only (display_name, workspace_name, workspace_id, status). No Fernet encryption needed for this path — but the existing `_encrypt_config` is still used for any future BYOC path.

### Pattern 3: Quota Tracking — Increment After Delivery

**What:** After a successful notification delivery (before marking `sent`), increment the team's monthly quota counter and check/set the `over_limit` flag.

**When to use:** In each channel worker's deliver() task, after `_send_email()` or `_send_slack_message()` returns without raising.

**Example:**
```python
# Source: custom pattern for this project
# In worker after successful send:
execute_update_query("""
    INSERT INTO team_quotas (team_id, period_start, monthly_count, over_limit)
    VALUES ($1, date_trunc('month', now()), 1, false)
    ON CONFLICT (team_id, period_start) DO UPDATE
    SET monthly_count = team_quotas.monthly_count + 1,
        over_limit = (team_quotas.monthly_count + 1) > $2,
        updated_at = now()
""", [uuid.UUID(team_id), MONTHLY_QUOTA_LIMIT])
```

**Note:** The upsert pattern handles the first notification of a new month cleanly. The `period_start` = `date_trunc('month', now())` creates a new row per month per team automatically — no cron reset job required.

### Pattern 4: Slack Disconnection Handling

**What:** When Slack sends a `tokens_revoked` event to alrt's Events API endpoint, find the team whose bot_token matches the revoked tokens and mark their Slack provider as `is_active = false`.

**When to use:** New API endpoint `POST /channels/slack/events` to receive Slack Events API callbacks.

**Slack Events API constraint:** The endpoint must respond with HTTP 200 within 3 seconds, and must verify the `X-Slack-Signature` header using HMAC-SHA256 with `SLACK_SIGNING_SECRET`.

**Example:**
```python
# Source: Slack Events API docs (docs.slack.dev/reference/events/tokens_revoked)
import hashlib, hmac, time

async def verify_slack_signature(request: Request) -> bool:
    timestamp = request.headers.get("X-Slack-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    body = await request.body()

    # Prevent replay attacks (5 minute window)
    if abs(time.time() - int(timestamp)) > 300:
        return False

    sig_base = f"v0:{timestamp}:{body.decode()}"
    expected = "v0=" + hmac.new(
        settings.slack_signing_secret.encode(),
        sig_base.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### Pattern 5: Dashboard Quota Banner

**What:** In `(dashboard)/layout.tsx`, fetch team quota status on mount and render a sticky warning banner above the main content when `over_limit = true`.

**When to use:** Add a `GET /teams/{team_id}/quota` endpoint; call it in the dashboard layout.

**Example placement in layout.tsx:**
```tsx
// Source: extension of existing DashboardLayout pattern
// Add above <main> in DashboardLayout:
{quotaExceeded && (
  <div className="bevel-inset bg-panel-yellow px-4 py-2 text-sm text-danger font-bold text-center">
    You've exceeded your monthly notification limit.
  </div>
)}
```

### Anti-Patterns to Avoid

- **Encrypting alrt_hosted config:** The `alrt_hosted` provider config stores no secrets (just display_name, workspace_name, etc.). Don't run it through Fernet — only BYOC configs need encryption.
- **Hard-coding the quota limit:** Store `MONTHLY_QUOTA_LIMIT` as an env var or constant — default 1000. Don't embed `1000` in the SQL upsert.
- **Blocking delivery while checking quota:** Quota check should be fire-and-forget after delivery — don't pre-check quota before sending (soft limit = deliver first, flag after).
- **Storing the Resend API key in the providers table:** alrt's Resend key is a platform secret, stored only in environment variables. Never put it in the DB.
- **Blocking the Slack Events API endpoint:** Must respond 200 within 3 seconds. Process `tokens_revoked` asynchronously (or inline if fast DB update).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | httpx + Resend API (already in email.py) | Bounce handling, TLS, SPF/DKIM all handled by Resend |
| Slack message sending | Direct Slack WebSocket | httpx + chat.postMessage (already in slack.py) | Rate limits, retries, error codes already handled |
| Monthly quota reset | Cron job that zeros counters | `date_trunc('month', now())` as upsert key | Self-resetting — new row per month, no job needed |
| Slack signature verification | Rolling your own crypto | HMAC-SHA256 with `X-Slack-Signature` header | Slack's documented security requirement |
| OAuth state param CSRF protection | Session storage | Fernet-encrypted team_id in state (already done) | Already implemented in providers.py |

**Key insight:** The existing codebase already implements 80% of what this phase needs — email delivery via Resend API and Slack OAuth are both working. This phase is about routing around per-team BYOC credentials to use alrt's own credentials, not building new delivery infrastructure.

---

## Common Pitfalls

### Pitfall 1: Resend Requires a Verified Sending Domain

**What goes wrong:** Sending from `noreply@alrt.dev` will be rejected unless `alrt.dev` has been verified in alrt's Resend account with SPF and DKIM DNS records.

**Why it happens:** Resend's API will return a 403 or 422 error if the `from` domain is not verified. The `resend.dev` sandbox domain is for testing only.

**How to avoid:** Before this phase goes live, `alrt.dev` must be added to the Resend dashboard and DNS records configured. This is a pre-flight infrastructure step, not a code step. The DKIM and SPF records are provided by Resend's dashboard.

**Warning signs:** `HTTP 403` or `HTTP 422` responses from `https://api.resend.com/emails` with error message about unverified domain.

### Pitfall 2: Slack OAuth Callback Redirects to Wrong URL

**What goes wrong:** The current `SLACK_REDIRECT_URI` env var defaults to `http://localhost:8000/providers/slack/callback`. In production, this must be the production API URL AND it must exactly match the Redirect URL configured in the Slack app settings.

**Why it happens:** Slack validates the redirect_uri on the callback. Any mismatch causes `redirect_uri_mismatch` error.

**How to avoid:** Set `SLACK_REDIRECT_URI` env var to production URL. If the route is renamed (e.g., `/channels/slack/callback`), update both the env var AND the Slack app's OAuth redirect URLs in the Slack app management console.

**Warning signs:** OAuth callback returns `error=redirect_uri_mismatch`.

### Pitfall 3: alrt_hosted Slack Provider — Active vs. Pending State

**What goes wrong:** If the Slack `alrt_hosted` provider is inserted as `is_active = true` at signup (before OAuth), the worker will query it and find no `bot_token` in config, causing a KeyError.

**Why it happens:** The worker does `config["bot_token"]` — if config is `{"status": "pending"}`, this crashes.

**How to avoid:** Insert Slack `alrt_hosted` as `is_active = false` at signup. The OAuth callback activates it by calling `UPDATE providers SET is_active = true, config = {encrypted bot_token} WHERE team_id = $1 AND channel = 'slack'` instead of INSERT.

**Warning signs:** `KeyError: 'bot_token'` in Celery worker logs.

### Pitfall 4: Quota Table Race Condition

**What goes wrong:** Two concurrent deliveries for the same team increment the quota counter simultaneously and both read `over_limit = false` before either writes — the flag doesn't get set correctly.

**Why it happens:** The read-then-write pattern in application code is not atomic.

**How to avoid:** Use the PostgreSQL `ON CONFLICT DO UPDATE` upsert with the threshold check in the same SQL statement (see Pattern 3). The DB handles atomicity.

**Warning signs:** `over_limit` flag not being set even after many deliveries.

### Pitfall 5: tokens_revoked Event Payload Contains User IDs, Not Tokens

**What goes wrong:** The `tokens_revoked` event payload's `tokens.bot` array contains **user IDs** (e.g., `U123456`), not the actual `xoxb-` token strings. If you try to match against stored tokens, you won't find anything.

**Why it happens:** Slack intentionally omits actual token values from the event for security.

**How to avoid:** Store `team_id` (the workspace ID from the OAuth response) in the provider config alongside `bot_token`. Use `team_id` from the `tokens_revoked` event's top-level `team_id` field to identify which team's provider to deactivate.

**Warning signs:** `tokens_revoked` handler runs but no providers are marked inactive.

### Pitfall 6: from Address Format in Resend

**What goes wrong:** Resend's `from` field accepts both `"noreply@alrt.dev"` and `"Team Name <noreply@alrt.dev>"`. If `display_name` contains special characters or is very long, the formatted string may be rejected.

**Why it happens:** Email headers have character limits and encoding requirements.

**How to avoid:** Sanitize `display_name` — strip angle brackets, limit to 64 chars, strip non-ASCII if needed. Use the format `f"{sanitized_name} <noreply@alrt.dev>"`.

**Warning signs:** Resend returns 422 Unprocessable Entity on the `from` field.

---

## Code Examples

Verified patterns from official sources:

### Resend Email Send via httpx (existing pattern, extended)
```python
# Source: existing email.py + Resend API docs (resend.com/docs/api-reference/emails/send-email)
def _send_via_alrt_resend(to_email, from_display, subject, body_html, cc=None, bcc=None):
    """Send using alrt's shared Resend account."""
    import os
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY not configured")

    payload = {
        "from": from_display,          # "Team Name <noreply@alrt.dev>"
        "to": [to_email],
        "subject": subject,
        "html": body_html,
    }
    if cc:
        payload["cc"] = cc
    if bcc:
        payload["bcc"] = bcc

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}"},
        json=payload,
        timeout=15,
    )
    _check_response(resp)  # existing helper in email.py
```

### Quota Upsert (PostgreSQL)
```sql
-- Source: PostgreSQL ON CONFLICT DO UPDATE documentation
-- Atomic increment with over_limit flag computation
INSERT INTO team_quotas (team_id, period_start, monthly_count, over_limit)
VALUES ($1, date_trunc('month', now()), 1, (1 > $2))
ON CONFLICT (team_id, period_start) DO UPDATE
SET monthly_count = team_quotas.monthly_count + 1,
    over_limit    = (team_quotas.monthly_count + 1) > $2,
    updated_at    = now()
```

### Slack OAuth Callback — Upsert Instead of Insert
```python
# Source: extension of existing providers.py pattern
# Replace INSERT with UPSERT to handle reconnect case:
await execute_query("""
    INSERT INTO providers (id, team_id, channel, provider_type, config, is_active)
    VALUES ($1, $2, 'slack', 'alrt_hosted', $3, true)
    ON CONFLICT (team_id, channel, provider_type)
    DO UPDATE SET config = $3, is_active = true, updated_at = now()
""", [uuid.uuid4(), team_id, encrypted_config])
```

### tokens_revoked Event Handler
```python
# Source: Slack Events API docs (docs.slack.dev/reference/events/tokens_revoked)
@router.post("/channels/slack/events")
async def slack_events(request: Request):
    """Handle Slack Events API callbacks including tokens_revoked."""
    body = await request.json()

    # URL verification challenge (required for Slack app setup)
    if body.get("type") == "url_verification":
        return {"challenge": body["challenge"]}

    event = body.get("event", {})
    if event.get("type") == "tokens_revoked":
        team_id = body.get("team_id")  # Slack workspace ID stored in provider config
        if team_id:
            await execute_update_query("""
                UPDATE providers
                SET is_active = false, updated_at = now()
                WHERE channel = 'slack'
                  AND provider_type = 'alrt_hosted'
                  AND (config->>'workspace_id') = $1
            """, [team_id])

    return {"ok": True}
```

### Quota Status API Endpoint
```python
# Source: project pattern — new endpoint following existing style
@router.get("/quota")
async def get_quota_status(team_id: uuid.UUID = Depends(get_current_team)):
    row = await execute_read_one_query("""
        SELECT monthly_count, over_limit, period_start
        FROM team_quotas
        WHERE team_id = $1
          AND period_start = date_trunc('month', now())
    """, [team_id])
    return {
        "over_limit": row["over_limit"] if row else False,
        "monthly_count": row["monthly_count"] if row else 0,
    }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BYOC credentials per team (existing) | alrt_hosted shared account for all new teams | Phase 2 | No email/Slack setup for new teams |
| `provider_type` values: `resend`, `sendgrid`, `slack_oauth` | Add `alrt_hosted` for both channels | Phase 2 | Worker branches on provider_type |
| Per-team encrypted API key in providers.config | alrt's Resend API key in env var | Phase 2 | Single key serves all teams |
| No quota tracking | `team_quotas` table with monthly upsert | Phase 2 | Abuse prevention + billing readiness |
| Slack OAuth creates new provider row each time | Slack OAuth upserts existing `alrt_hosted` row | Phase 2 | Handles reconnect case cleanly |

**Current email.py behavior (important):** The email worker currently reads a provider from the DB and expects `config["encrypted"]` to be present. For `alrt_hosted`, there is no `encrypted` key — the branch must come before any `get_fernet()` call.

---

## Schema Design (Claude's Discretion — Recommended)

### New Table: `team_quotas`
```sql
CREATE TABLE IF NOT EXISTS team_quotas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id),
    period_start TIMESTAMPTZ NOT NULL,          -- date_trunc('month', now())
    monthly_count INTEGER NOT NULL DEFAULT 0,
    over_limit   BOOLEAN NOT NULL DEFAULT false,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_team_quotas_team_period
    ON team_quotas(team_id, period_start);
```

**Why this schema:**
- `UNIQUE(team_id, period_start)` enables the ON CONFLICT upsert without a separate lock
- `period_start = date_trunc('month', now())` is the self-resetting month boundary — no cron needed
- `over_limit` is a precomputed flag checked cheaply by the dashboard/API
- Separate table keeps `teams` clean; historical quota data is preserved per month

### teams Table Addition (display_name)
Teams need a `display_name` for the email from-address. Two options:
1. Store in `teams` table as a new nullable column `email_display_name`
2. Store in the `alrt_hosted` email provider's unencrypted config

**Recommendation:** Store in the `alrt_hosted` email provider config as `display_name`. This keeps it close to the channel it affects, no schema change to `teams`, and follows the existing pattern of provider config holding channel-specific settings.

### providers Table — No Schema Change Needed
The existing `providers` table already has `provider_type VARCHAR(50)` — adding `alrt_hosted` is just a new value, no DDL change. The `config JSONB` field stores non-secret metadata for `alrt_hosted` rows (no encryption wrapper needed).

**UNIQUE constraint consideration:** The providers table does NOT have a UNIQUE constraint on `(team_id, channel)`. For `alrt_hosted`, we want at most one active provider per channel per team. Enforce this at the application layer (upsert or check-then-insert in the signup path) rather than adding a DB constraint (which would break historical BYOC or multi-provider future use cases).

---

## Open Questions

1. **Resend domain verification pre-flight**
   - What we know: `alrt.dev` must be verified in Resend's dashboard with SPF + DKIM DNS records before Phase 2 can go live
   - What's unclear: Whether `alrt.dev` has already been added to Resend or needs to be configured now
   - Recommendation: This is an infrastructure task (not code) — add it as a Wave 0 prerequisite. The planner should include a step: "Verify alrt.dev in Resend dashboard before deploying email changes."

2. **Slack App Events API URL**
   - What we know: The `tokens_revoked` event requires a valid Events API endpoint registered in the Slack app settings, verified by Slack's URL verification challenge
   - What's unclear: Whether alrt's Slack app is already registered and what URL it points to
   - Recommendation: The planner should include a step: "Register `/channels/slack/events` as Events API URL in Slack app settings after deploying." The URL verification challenge handler is included in the code example above.

3. **SLACK_SIGNING_SECRET env var**
   - What we know: Verifying `tokens_revoked` payloads requires `SLACK_SIGNING_SECRET` from the Slack app settings
   - What's unclear: Whether this is already in the env/config
   - Recommendation: Add `slack_signing_secret: str = ""` to `config.py` alongside existing Slack settings.

4. **Quota increment placement — worker vs API**
   - What we know: Quota should increment after successful delivery; increment must be reliable
   - What's unclear: Whether to increment in the Celery worker (after `_send_email()`) or in a separate task
   - Recommendation: Increment inline in the worker after the send succeeds (before marking `sent`). Use a fire-and-forget DB update — if it fails, delivery still succeeded and the notification is marked `sent`. Quota undercounting is acceptable; quota over-counting is not.

---

## Sources

### Primary (HIGH confidence)
- Resend API docs (resend.com/docs/api-reference/emails/send-email) — from/to/subject fields, Python httpx pattern
- Slack Events API docs (docs.slack.dev/reference/events/tokens_revoked) — tokens_revoked payload, user IDs not token strings
- Slack chat.postMessage docs (docs.slack.dev/reference/methods/chat.postMessage) — required scopes, channel param types
- Existing codebase (apps/workers/alrt_workers/tasks/channels/email.py, slack.py) — current delivery patterns
- Existing codebase (apps/api/alrt/routes/providers.py) — complete Slack OAuth flow already implemented
- Existing codebase (schema.sql) — providers table schema, no UNIQUE constraint on (team_id, channel)

### Secondary (MEDIUM confidence)
- Resend docs (resend.com/docs/dashboard/domains/introduction) — domain verification required for production sending
- Slack OAuth v2 docs (docs.slack.dev/authentication/installing-with-oauth) — oauth.v2.access response structure

### Tertiary (LOW confidence)
- WebSearch: Resend domain verification is mandatory before production sending (confirmed by multiple sources, MEDIUM elevated)
- WebSearch: Slack `tokens_revoked` event contains user IDs not token strings (confirmed by official docs, HIGH)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all needed libraries already in use
- Architecture patterns: HIGH — patterns derived from existing working code in codebase
- Resend API integration: HIGH — verified against official docs; httpx pattern already works
- Slack OAuth: HIGH — existing implementation already complete; incremental changes only
- Quota tracking: HIGH — standard PostgreSQL ON CONFLICT upsert pattern, well-understood
- Pitfalls: HIGH — verified against official Slack docs (tokens_revoked payload format) and Resend docs (domain verification requirement)

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (Slack OAuth v2 and Resend API are stable; 30-day window)
