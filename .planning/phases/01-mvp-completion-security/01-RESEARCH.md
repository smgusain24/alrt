# Phase 1: MVP Completion + Security — Research

**Researched:** 2026-02-28
**Domain:** FastAPI/Python backend feature work + Next.js 14 dashboard pages + bug fixes
**Confidence:** HIGH — based entirely on direct codebase inspection, no guesswork

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Activity feed layout**
- Table rows, not cards or grouped view — dense, scannable, fits many events at once
- Columns: timestamp, event name, subscriber, channel badges, status

**Channel delivery status display**
- Inline channel badges per row — e.g., [email ✓] [slack ✓] [in-app ✗]
- No expandable rows needed; badge approach is sufficient for at-a-glance status

**Real-time behavior**
- New event rows slide in at the top automatically
- No "X new events" banner — live auto-insert, feels like a log tail

**Activity feed filtering**
- Full search: filter/search by subscriber, event name, status, AND channel
- Most powerful approach — user explicitly wants full search in Phase 1

**Analytics layout**
- Stat cards + bar chart layout
- Top row: 3-4 big number stat cards (total sent, delivered, failed, failure rate)
- Below: bar chart breaking down by channel

**Analytics default time range**
- Last 7 days as default; 30-day toggle available

**Failure rate highlighting**
- Failure rate card/cell turns red when above threshold (e.g., >5%)
- Color-based signal — immediate visual attention without a banner

**Analytics primary metric**
- Total notifications sent is the top-line metric (volume)
- Failure rate is secondary — shown but not the hero number

### Claude's Discretion
- Exact failure rate threshold for red highlighting (e.g., 5% vs 10%)
- Bar chart axis labels and tick intervals
- Exact column widths and spacing in activity table
- httponly cookie fix — clear-cut code change, no design decisions
- Delay resume bug fix — clear-cut code change, no design decisions
- Team invite flow and role enforcement — user did not select these for discussion; Claude has full discretion on invite UX, role model, and UI blocking

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MVP-01 | Dashboard shows real-time activity feed of all notification events with delivery status per channel | New API endpoint needed: `GET /activity` queries `notifications` + `subscribers` + `workflows` with team-scope; SSE or polling for real-time; dashboard page at `/activity` |
| MVP-02 | Dashboard shows analytics — total notifications sent, per-channel breakdown, failure rates (last 7/30 days) | Analytics API already exists (`/analytics/overview`, `/analytics/delivery`, `/analytics/notifications/timeline`); dashboard page exists but must be redesigned to match locked layout (stat cards + bar chart, not pie chart) |
| MVP-03 | Team admin can invite members by email; invited members have admin or viewer roles | Zero invite infrastructure exists today — needs: DB schema additions (team_members or invite tokens table), API endpoints for invite/accept/list, role enforcement in deps.py, dashboard UI in settings |
| MVP-04 | JWT cookie has httponly=True flag | Confirmed bug: both `signup` and `login` in `apps/api/alrt/routes/auth.py` set `httponly=False`; fix is 2-line change; frontend `api.ts` must also change to stop reading cookie from JS |
| FIX-01 | Delay node resume passes full subscriber context | Confirmed bug: `apps/workers/alrt_workers/tasks/delay.py` calls `execute_step(..., None, None, ...)` — subscriber_id and team_id are not stored in `scheduled_steps`; fix requires storing them there |
</phase_requirements>

---

## Summary

This phase involves five distinct work streams across backend, workers, and frontend. Two are pure bug fixes (MVP-04 cookie security, FIX-01 delay resume). Two are new dashboard pages (MVP-01 activity feed, MVP-02 analytics redesign). One is a full new feature stack (MVP-03 team invites).

The good news: the data infrastructure is mostly there. The `notifications` table already has all the columns needed for an activity feed (team_id, subscriber_id, workflow_id, channel, status, created_at). The analytics API endpoints already exist and return correct data. The users table already has a `role` column defaulting to 'admin'. The bad news: the activity feed needs a new team-scoped API endpoint (current notifications API is subscriber-scoped), the analytics dashboard page needs a complete redesign to match the locked layout, and team invites need to be built entirely from scratch.

The two bug fixes are surgical and well-understood: the cookie fix is literally changing `httponly=False` to `httponly=True` in two places plus updating the frontend auth flow; the delay resume fix requires storing `subscriber_id` and `team_id` in the `scheduled_steps` table so they can be retrieved on resume.

**Primary recommendation:** Implement in this order: (1) FIX-01 and MVP-04 first (lowest risk, unblock security), (2) MVP-01 activity feed (new API + new page), (3) MVP-02 analytics redesign (API exists, just UI work), (4) MVP-03 team invites (most complex, needs schema migration).

---

## Standard Stack

### Core (existing — do not change)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | (installed) | API routes | Project standard — all routes use this |
| asyncpg | (installed) | Raw SQL via pool | Project standard — `db.py` helpers: `execute_read_query`, `execute_insert_query`, `execute_update_query` |
| python-jose | (installed) | JWT encode/decode | Used in auth.py and websocket.py already |
| bcrypt | (installed) | Password hashing | Used in auth.py already |
| Next.js 14 | ^14 | Dashboard frontend | Project standard |
| TypeScript | ^5 | Frontend language | Project standard |
| Tailwind CSS | ^3 | Styling | Project standard |
| Recharts | ^3.7.0 | Charts | Already installed and used in analytics page |
| lucide-react | ^0.575.0 | Icons | Already installed and used throughout |

### Supporting (existing retro design system components)
| Component | File | Purpose |
|-----------|------|---------|
| WindowCard | `components/retro/WindowCard.tsx` | All content panels |
| RetroTable | `components/retro/RetroTable.tsx` | Data tables |
| Badge | `components/retro/Badge.tsx` | Status/channel badges |
| RetroButton | `components/retro/RetroButton.tsx` | All buttons |
| RetroModal | `components/retro/RetroModal.tsx` | Modals/dialogs |
| BeveledInput | `components/retro/BeveledInput.tsx` | Text inputs |
| GrooveDivider | `components/retro/GrooveDivider.tsx` | Section dividers |

### No new packages needed
All dependencies are already installed. Do NOT add new packages for any work in this phase.

---

## Architecture Patterns

### Project conventions (MUST follow)

**Backend — raw SQL pattern:**
```python
# Source: apps/api/alrt/queries/analytics.py + apps/api/alrt/routes/analytics.py

# 1. Define SQL in queries/[table].py as string constants
MY_QUERY = """
    SELECT n.id, n.channel, n.status, s.name as subscriber_name
    FROM notifications n
    JOIN subscribers s ON s.id = n.subscriber_id
    WHERE n.team_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3
"""

# 2. Use db helpers in routes/[feature].py
from alrt.db import execute_read_query, execute_read_one_query
rows = await execute_read_query(my_q.MY_QUERY, [team_id, limit, offset])
```

**Backend — route pattern:**
```python
# Source: apps/api/alrt/routes/analytics.py

@router.get("/activity", response_model=ActivityFeedResponse)
@limiter.limit(settings.rate_limit_read)
async def get_activity_feed(
    request: Request,
    # filters as Query params
    subscriber: str | None = None,
    event_name: str | None = None,
    status: str | None = None,
    channel: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    team_id: uuid.UUID = Depends(get_current_team),
):
    ...
```

**Backend — register router in main.py:**
```python
# Source: apps/api/alrt/main.py
app.include_router(activity.router)  # add alongside existing routers
```

**Frontend — page pattern (client component):**
```typescript
// Source: apps/dashboard/src/app/(dashboard)/logs/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { WindowCard, RetroTable, Badge, RetroButton, BeveledInput } from "@/components/retro";
import { api } from "@/lib/api";

export default function ActivityPage() {
    const [rows, setRows] = useState([]);
    // ... fetch + render
}
```

**Frontend — add API method in api.ts:**
```typescript
// Source: apps/dashboard/src/lib/api.ts
// Add to the api object:
activity: {
    list: (params?: Record<string, string | number>) => {
        const qs = params ? "?" + new URLSearchParams(...).toString() : "";
        return request(`/activity${qs}`);
    },
},
```

**Frontend — register nav item in layout.tsx:**
```typescript
// Source: apps/dashboard/src/app/(dashboard)/layout.tsx
// NAV_ITEMS array — add activity between subscribers and analytics:
{ href: "/activity", label: "Activity", icon: Activity },
```

### Recommended new file structure for this phase

```
apps/api/alrt/
├── queries/
│   └── activity.py          # new — SQL for team-scoped activity feed
├── routes/
│   └── activity.py          # new — GET /activity endpoint
├── schemas/
│   └── activity.py          # new — ActivityFeedItem, ActivityFeedResponse Pydantic models
└── routes/auth.py            # modify — httponly=True fix (2 lines)

apps/workers/alrt_workers/
├── tasks/delay.py            # modify — pass subscriber_id/team_id on resume
└── (schema change: scheduled_steps table needs 2 new columns)

apps/dashboard/src/
├── app/(dashboard)/
│   ├── activity/
│   │   └── page.tsx          # new — activity feed page
│   ├── analytics/
│   │   └── page.tsx          # modify — redesign to stat cards + bar chart
│   └── settings/
│       └── members/
│           └── page.tsx      # new — team members + invite UI
├── lib/api.ts                # modify — add activity endpoints, invite endpoints; fix cookie read after httponly
└── app/(dashboard)/layout.tsx  # modify — add activity nav item, add members subnav

schema.sql                    # modify — add invite_tokens table or team_invites table
```

### Pattern: Real-time activity feed (polling vs SSE)

The existing WebSocket implementation (`websocket.py`) is subscriber-scoped — one connection per end-user subscriber. For the admin dashboard activity feed, a team-scoped real-time view is needed.

**Recommended approach: polling with prepend animation (simpler, reliable)**
- Poll `GET /activity?per_page=50` every 5 seconds
- Compare new results to current — prepend new rows with CSS slide-in animation
- This avoids opening another WebSocket channel for dashboard admin sessions
- Matches the "log tail" feel without SSE complexity

**Why not SSE or WebSocket:** The existing Redis Pub/Sub fanout is subscriber-scoped. Adding a team-scoped channel is extra complexity that polling handles well at this scale (startup-grade, <10k events/day).

### Anti-Patterns to Avoid

- **Do NOT use an ORM.** Project uses raw SQL via asyncpg helpers. All queries go in `queries/` files.
- **Do NOT read `document.cookie` after httponly fix.** Once `httponly=True`, JS cannot read the cookie. The frontend must use the `token` field from the API response body instead. `api.ts` already calls `setToken(res.token)` from the response body for login/signup — but `setToken` currently writes to `document.cookie` too. After the fix, the auth flow should rely solely on the server-set httponly cookie, and the JS `setToken`/`getToken`/`clearToken` functions may need to be removed or stubbed.
- **Do NOT add new columns to `scheduled_steps` casually.** Schema changes must be backward compatible — `ensure_schema()` in `db.py` auto-creates tables but does NOT run ALTER TABLE. The fix for FIX-01 should either (a) store subscriber_id/team_id in the existing `payload` JSONB column, or (b) add a schema migration. Option (a) is simpler and avoids schema changes.
- **Do NOT use `email_verified` for team invites.** The existing `email_verified` column is unimplemented (always `false`). Invite flow should use a separate invite token system.
- **Do NOT reuse the subscriber WebSocket for admin feed.** The WebSocket at `/ws` is for end-user subscribers, not admin dashboard sessions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing for invited users | Custom hashing | bcrypt (already used in auth.py) | Already imported, consistent |
| JWT for invite tokens | Custom token | python-jose JWT with short expiry | Already in project, handles expiry |
| Token verification in deps.py | Custom middleware | Extend existing `get_current_user` / `get_current_team` | Pattern already established |
| Role enforcement | Custom RBAC system | Simple role check in deps/routes: `if user["role"] != "admin": raise HTTPException(403)` | Only admin/viewer needed |
| Chart rendering | Custom SVG | Recharts (already installed) | Already used in analytics page |
| Status badge rendering | Custom component | `Badge` component (already built) | Already used across all pages |
| Table rendering | Custom table | `RetroTable` component (already built) | Already used across all pages |
| Modal dialogs | Custom overlay | `RetroModal` component (already built) | Already used in settings page |
| Email sending for invites | Custom SMTP | Existing email channel (SendGrid/Resend via Celery) | Reuse channels/email.deliver pattern |

**Key insight:** This codebase has a very consistent set of established patterns. The fastest path to completion is following the existing logs page, analytics page, and settings page as templates. New work is mostly "do what the other pages do."

---

## Common Pitfalls

### Pitfall 1: httponly cookie breaks JS auth flow
**What goes wrong:** After setting `httponly=True`, `document.cookie` will no longer contain `alrt_token`. The `getToken()` function in `api.ts` will return `null`. Every authenticated request will fail with 401.
**Why it happens:** `getToken()` reads `document.cookie` directly — that's the entire mechanism for reading auth state in the frontend.
**How to avoid:** The API already returns `token` in the response body for login/signup. Store the token in `localStorage` or `sessionStorage` instead of a JS-readable cookie. Alternatively, use the httponly cookie exclusively for authentication and remove the JS token reading entirely — but this requires the backend to not require the `Authorization: Bearer` header (or accept the httponly cookie directly via FastAPI's `Request.cookies`).
**Recommended fix:** Store token in `localStorage` after login/signup (read from response body). Remove `document.cookie` reading from `getToken()`. The httponly cookie from the server continues to be sent automatically on same-origin requests. But since the dashboard uses `Authorization: Bearer` headers (not cookie-based auth), the httponly cookie is an additional security layer on top. The actual fix path: keep using the response body token for `Authorization: Bearer`, and set `httponly=True` on the cookie so it cannot be stolen by XSS even if it's also present.
**Warning signs:** 401 errors on all authenticated requests after deploy.

### Pitfall 2: Delay resume loses subscriber context (confirmed bug)
**What goes wrong:** When a delay node fires, `poll_scheduled_steps` in `delay.py` calls `execute_step(... None, None ...)` for `subscriber_id` and `team_id`. This means DND, frequency caps, and channel preferences cannot be checked on resume.
**Why it happens:** `scheduled_steps` table only stores `workflow_execution_id`, `next_step_id`, and `payload` — no `subscriber_id` or `team_id`. The delay task retrieves the step but has no way to look up the subscriber.
**How to avoid:** The simplest fix is to embed `subscriber_id` and `team_id` in the `payload` JSONB when inserting the scheduled step (in `_handle_delay` in `step_runner.py`). Then in `delay.py`, extract them from `step["payload"]` before calling `execute_step`. This avoids any schema changes.
**Alternative fix:** Add a JOIN to `workflow_executions` in `Q_GET_DUE_STEPS` to retrieve `subscriber_id` and `team_id`. This is cleaner but requires modifying the query.
**Warning signs:** Notifications fire during DND hours for delayed workflows; frequency caps not respected after delays.

### Pitfall 3: Activity feed query performance
**What goes wrong:** Joining notifications + subscribers + workflows for team-scoped queries without proper indexes becomes slow at volume.
**Why it happens:** The `notifications` table has `team_id` and `created_at` but may not have a composite index for activity feed queries.
**How to avoid:** Add a partial index or composite index on `(team_id, created_at DESC)` on the `notifications` table. Use pagination (limit/offset) — already done in the logs page pattern.
**Warning signs:** Activity feed page takes >500ms to load with 1000+ notifications.

### Pitfall 4: Analytics page redesign must not break existing API
**What goes wrong:** The existing analytics page calls 4 API endpoints. A redesign might assume new endpoints or different response shapes.
**Why it happens:** The CONTEXT.md locks a different layout (stat cards + bar chart) than what's currently built (animated counters + bar chart + pie chart + workflow table).
**How to avoid:** The existing API endpoints (`/analytics/overview`, `/analytics/delivery`, `/analytics/timeline`) return the exact data needed for the new layout. The redesign is purely frontend — no API changes needed. Reuse the same `api.analytics.*` calls.
**Warning signs:** Touching backend analytics routes unnecessarily.

### Pitfall 5: Team invite — schema migration not auto-applied
**What goes wrong:** `ensure_schema()` creates tables that don't exist but does NOT run ALTER TABLE or add new tables to existing schemas automatically.
**Why it happens:** `ensure_schema()` in `db.py` runs `schema.sql` with `CREATE TABLE IF NOT EXISTS` — new tables in `schema.sql` ARE auto-created. But if the file isn't updated, the table won't exist.
**How to avoid:** Add the new `team_invites` table to `schema.sql`. It will be created automatically on next startup.
**Warning signs:** Foreign key violations or "relation does not exist" errors on invite endpoints.

### Pitfall 6: Role enforcement — admin check needed on invite endpoints
**What goes wrong:** Without role checking, a viewer could invite more users or change roles.
**Why it happens:** Existing `get_current_team` dependency only validates the team, not the user role.
**How to avoid:** Create a `get_current_user_with_role` dependency or inline role check: query user from JWT `user_id` claim, verify `role == 'admin'`.
**Warning signs:** Any user can send invites or change member roles.

---

## Code Examples

Verified patterns from direct codebase inspection:

### FIX-01: Delay resume bug fix (embed subscriber context in payload)

In `apps/workers/alrt_workers/tasks/step_runner.py`:
```python
# Source: apps/workers/alrt_workers/tasks/step_runner.py (_handle_delay)
def _handle_delay(execution_id, node, payload, subscriber_id=None, team_id=None):
    duration = node.get("data", {}).get("duration_seconds", 60)
    next_step_id = node.get("id")

    # Embed subscriber context in payload so resume can retrieve it
    stored_payload = {
        **(payload or {}),
        "__subscriber_id": subscriber_id,
        "__team_id": team_id,
    }

    execute_insert_query(Q_CREATE_SCHEDULED_STEP, [
        uuid.uuid4(),
        uuid.UUID(execution_id),
        next_step_id,
        stored_payload,
        datetime.now(timezone.utc) + timedelta(seconds=duration),
    ])
    return "paused"
```

In `apps/workers/alrt_workers/tasks/delay.py`:
```python
# Source: apps/workers/alrt_workers/tasks/delay.py (poll_scheduled_steps)
for step in due_steps:
    execute_update_query(Q_UPDATE_STEP_STATUS, [step["id"], "processing"])

    payload = step["payload"] or {}
    subscriber_id = payload.pop("__subscriber_id", None)
    team_id = payload.pop("__team_id", None)

    from alrt_workers.tasks.step_runner import execute_step
    execute_step(
        str(step["workflow_execution_id"]),
        {"id": step["next_step_id"], "type": "resume"},
        subscriber_id,
        team_id,
        payload,
        {},  # preferences — need to fetch from DB using subscriber_id
    )
```

Note: preferences also need to be fetched from DB using `subscriber_id` on resume. Add a DB query in `delay.py` to load `channel_preferences` from the subscribers table.

### MVP-04: Cookie httponly fix

In `apps/api/alrt/routes/auth.py` — both `signup` and `login` endpoints:
```python
# Source: apps/api/alrt/routes/auth.py
# Change both set_cookie calls:
response.set_cookie(
    key="alrt_token", value=token, httponly=True,   # was: httponly=False
    secure=True,                                       # was: secure=False (set True for production)
    samesite="lax", max_age=JWT_EXPIRY_HOURS * 3600,
)
```

Frontend `apps/dashboard/src/lib/api.ts` — `getToken()` still reads from `document.cookie` which will fail. The token from the response body is already stored via `setToken(res.token)`. The simplest fix: store token in `sessionStorage` or `localStorage` instead of `document.cookie`:
```typescript
// Source: apps/dashboard/src/lib/api.ts
// Replace cookie-based token storage with localStorage:
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("alrt_token");
}

function setToken(token: string) {
  localStorage.setItem("alrt_token", token);
}

function clearToken() {
  localStorage.removeItem("alrt_token");
}
```

### MVP-01: Activity feed — new SQL query

In `apps/api/alrt/queries/activity.py` (new file):
```python
# Pattern from: apps/api/alrt/queries/analytics.py

LIST_ACTIVITY = """
    SELECT
        n.id,
        n.created_at,
        w.event_name,
        s.name as subscriber_name,
        s.external_id as subscriber_external_id,
        n.channel,
        n.status,
        n.error_reason,
        n.workflow_execution_id
    FROM notifications n
    JOIN subscribers s ON s.id = n.subscriber_id
    LEFT JOIN workflows w ON w.id = n.workflow_id
    WHERE n.team_id = $1
      AND ($2::varchar IS NULL OR s.external_id ILIKE '%' || $2 || '%' OR s.name ILIKE '%' || $2 || '%')
      AND ($3::varchar IS NULL OR w.event_name ILIKE '%' || $3 || '%')
      AND ($4::varchar IS NULL OR n.status = $4)
      AND ($5::varchar IS NULL OR n.channel = $5)
    ORDER BY n.created_at DESC
    LIMIT $6 OFFSET $7
"""

COUNT_ACTIVITY = """
    SELECT COUNT(*) as total
    FROM notifications n
    JOIN subscribers s ON s.id = n.subscriber_id
    LEFT JOIN workflows w ON w.id = n.workflow_id
    WHERE n.team_id = $1
      AND ($2::varchar IS NULL OR s.external_id ILIKE '%' || $2 || '%' OR s.name ILIKE '%' || $2 || '%')
      AND ($3::varchar IS NULL OR w.event_name ILIKE '%' || $3 || '%')
      AND ($4::varchar IS NULL OR n.status = $4)
      AND ($5::varchar IS NULL OR n.channel = $5)
"""
```

### MVP-01: Activity feed — per-row channel badge pattern

The activity feed shows channel delivery status per notification row. Since each `notification` row represents ONE channel delivery, the badge approach is simple:
```typescript
// Each row is one channel delivery — show status inline
function ChannelStatusBadge({ channel, status }: { channel: string; status: string }) {
    const icon = status === "sent" ? "✓" : status === "failed" ? "✗" : "·";
    const variant = status === "sent" ? "success" : status === "failed" ? "danger" : "warning";
    return <Badge variant={variant}>[{channel.replace("_", "-")} {icon}]</Badge>;
}
```

Note: The CONTEXT.md shows "[email ✓] [slack ✓] [in-app ✗]" which implies multiple channel badges per event/execution. To show all channels for one workflow execution, the query must GROUP or the page must fetch per-execution notifications. The simpler approach: one row per notification (one channel per row), which is what the notifications table naturally represents. The "multiple badges per row" view would require grouping by `workflow_execution_id`.

**Recommended:** Group by `workflow_execution_id`, aggregate channel/status pairs as JSONB array. Alternative: show one row per notification (simpler, still scannable). Claude has discretion here — recommend grouping for a better UX.

### MVP-02: Analytics redesign — new layout structure

The analytics page exists at `apps/dashboard/src/app/(dashboard)/analytics/page.tsx`. The locked layout is:
- **Top row:** 3-4 stat cards (total sent, delivered, failed, failure rate)
- **Below:** bar chart breaking down by channel

The existing API response shapes already support this:
- `/analytics/overview` → `{ metrics: { total_sent, total_failed, total_pending } }`
- `/analytics/delivery` → `{ channels: [{ channel, sent, failed, pending, success_rate }] }`

The failure rate is derived: `total_failed / (total_sent + total_failed) * 100`.

Failure rate card turns red when above threshold (5% recommended — matches industry standard alerting).

The existing page has the wrong layout (animated counters + pie + workflow table). Replace entirely with the locked layout. Remove the workflow metrics table and pie chart. Keep the timeline chart below the channel bar chart if space allows (it's useful context).

### MVP-03: Team invites — new schema

New table in `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    token_hash VARCHAR(64) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, email)
);
```

Invite flow:
1. Admin POSTs `{ email, role }` to `POST /teams/{team_id}/invites` → generates token, stores hash, emails the invite link
2. Invitee clicks link with token → GET `/auth/accept-invite?token=...` → validates token, shows set-password form
3. Invitee POSTs `{ token, password, name }` to `POST /auth/accept-invite` → creates user record with specified role and team_id, marks invite accepted
4. Dashboard settings page shows member list + pending invites, admin-only invite button

New queries file: `apps/api/alrt/queries/team_invites.py`
New routes: extend `apps/api/alrt/routes/teams.py` or new `apps/api/alrt/routes/invites.py`
New page: `apps/dashboard/src/app/(dashboard)/settings/members/page.tsx`

For email delivery of invite: use the existing Celery email channel OR a direct SMTP call. Given that Phase 2 replaces provider credentials with shared sending, for now the invite email should use whatever email provider the team has configured. If none configured, show the invite link directly in the dashboard (copy-link flow).

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Analytics page uses pie chart + animated counters + workflow table | Locked decision: stat cards + bar chart | Analytics page must be fully redesigned |
| Cookie set with `httponly=False` | Must be `httponly=True` | Frontend token storage mechanism must change |
| Delay resume loses subscriber_id/team_id | Must embed in payload or JOIN on resume | DND and frequency caps now work for delayed workflows |
| No activity feed page | New `/activity` page with team-scoped notifications | Operators can now see all notification events in real time |
| No team members management | New invite flow + member list | Beta launch requires multi-user team support |

**What exists and is correct (do not change):**
- All 4 analytics API endpoints — return correct data, no changes needed
- Redis Pub/Sub WebSocket infrastructure — correct for subscriber-scoped real-time
- JWT auth flow — correct (only the cookie security flag needs fixing)
- `workflow_executions` table stores `subscriber_id` and `team_id` — can JOIN from delay.py as alternative fix approach
- All retro design system components — use as-is

**What does not exist and must be built:**
- `GET /activity` — team-scoped notification activity feed endpoint
- `POST /teams/{team_id}/invites` + `POST /auth/accept-invite` — invite flow
- `GET /teams/{team_id}/members` — member list endpoint
- `apps/dashboard/src/app/(dashboard)/activity/page.tsx`
- `apps/dashboard/src/app/(dashboard)/settings/members/page.tsx`

---

## Open Questions

1. **Activity feed: group by execution vs one row per notification**
   - What we know: `notifications` table has one row per channel delivery; `workflow_execution_id` links all channels for one trigger
   - What's unclear: CONTEXT.md shows "[email ✓] [slack ✓] [in-app ✗]" which implies grouped view; but "table rows, not cards" and "feels like a log tail" could mean one row per notification
   - Recommendation: Build grouped view (by `workflow_execution_id`) using a SQL aggregation. Show one row per event trigger, with all channel statuses as badges. This matches the CONTEXT.md mockup and is more useful. Use `json_agg` or aggregate in application code.

2. **Invite email delivery when no email provider configured**
   - What we know: Email delivery requires a configured SendGrid/Resend provider in Phase 1; Phase 2 adds shared sending
   - What's unclear: MVP-03 is in Phase 1 but shared sending isn't available until Phase 2
   - Recommendation: For Phase 1, if no email provider is configured, show the invite link directly in the dashboard UI with a "Copy invite link" button. This unblocks the feature without requiring a provider.

3. **Cookie fix — `secure=True` in development**
   - What we know: Setting `secure=True` requires HTTPS; local dev runs on HTTP
   - What's unclear: Whether to conditionally set `secure` based on environment
   - Recommendation: Use `settings.environment != "development"` or a `settings.cookie_secure` boolean from config to toggle. Do not break local dev.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified by reading actual source files
  - `apps/api/alrt/routes/auth.py` — confirmed `httponly=False` bug
  - `apps/workers/alrt_workers/tasks/delay.py` — confirmed `None, None` subscriber_id/team_id bug
  - `apps/api/alrt/queries/analytics.py` + `routes/analytics.py` — confirmed analytics API exists with correct data
  - `apps/dashboard/src/app/(dashboard)/analytics/page.tsx` — confirmed layout must be redesigned
  - `schema.sql` — confirmed `users.role` column exists; confirmed no `team_invites` table
  - `apps/dashboard/src/app/(dashboard)/layout.tsx` — confirmed sidebar nav structure
  - `apps/dashboard/src/lib/api.ts` — confirmed cookie-reading `getToken()` function

### Secondary (MEDIUM confidence)
- Pattern inference from logs page (`logs/page.tsx`) as template for activity feed page structure
- Pattern inference from settings page (`settings/page.tsx`) as template for members/invites page

### Tertiary (LOW confidence)
- None — all claims are based on direct code inspection

---

## Metadata

**Confidence breakdown:**
- Bug fixes (MVP-04, FIX-01): HIGH — root cause confirmed by reading source code
- Activity feed (MVP-01): HIGH — data shape confirmed; pattern from logs page
- Analytics redesign (MVP-02): HIGH — API confirmed working; layout locked in CONTEXT.md
- Team invites (MVP-03): MEDIUM — no existing code; schema design is standard but untested
- Frontend auth flow after httponly: MEDIUM — requires careful coordination between cookie and localStorage/sessionStorage

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable stack, 30 days)
