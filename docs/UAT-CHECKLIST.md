# Alrt — UAT (User Acceptance Testing) Checklist

**Prerequisites:**
- Docker running: `docker-compose up -d` (Postgres + Redis)
- API running: `cd apps/api && uvicorn alrt.main:app --reload`
- Dashboard running: `cd apps/dashboard && npm run dev`
- Fresh database (tables auto-created on first API startup)

---

## 1. Landing Page (http://localhost:3000)

- [ ] Page loads with retro styling (bevels, bold fonts, no border-radius)
- [ ] Marquee scrolling text is visible below nav
- [ ] Rainbow animated headline renders
- [ ] Code example tabs work (curl, TypeScript, Python, Go)
- [ ] Code block has copy button that works
- [ ] "Get Started" / "Get Started Free" buttons link to /signup
- [ ] "Log In" button links to /login
- [ ] "View Docs" button links to /docs
- [ ] Features grid shows 6 WindowCards
- [ ] Pricing section shows 3 tiers with "HOT!" badge on Pro
- [ ] Construction stripe CTA section renders
- [ ] Footer links work
- [ ] Page is responsive on mobile (test at 375px width)

## 2. API Docs Page (http://localhost:3000/docs)

- [ ] Sidebar shows all 8 sections
- [ ] Clicking sidebar items scrolls to correct section
- [ ] Scroll-spy highlights active section in sidebar
- [ ] Getting Started shows 3-step quickstart with code examples
- [ ] Authentication section shows key types + rate limits tables
- [ ] All 26 endpoints are documented with params + examples
- [ ] Code blocks have working copy buttons
- [ ] Method badges are color-coded (GET=blue, POST=green, PATCH=yellow, DELETE=red)
- [ ] Page is readable and navigable on mobile

## 3. Signup Flow (http://localhost:3000/signup)

- [ ] Signup form renders (team name, name, email, password)
- [ ] Submit with valid data → redirects to /workflows
- [ ] User email appears in dashboard topbar
- [ ] Submit with duplicate email → shows "Email already registered" error
- [ ] Submit with empty fields → browser validation prevents submit
- [ ] Loading state shows "Creating account..." on button

## 4. Login Flow (http://localhost:3000/login)

- [ ] Login form renders (email, password)
- [ ] Login with valid credentials → redirects to /workflows
- [ ] Login with wrong password → shows "Invalid email or password" error
- [ ] Login with non-existent email → shows error
- [ ] Loading state shows "Logging in..." on button
- [ ] Link to signup page works

## 5. Auth Guards

- [ ] Visiting /workflows without login → redirects to /login
- [ ] Visiting /subscribers without login → redirects to /login
- [ ] Visiting /settings without login → redirects to /login
- [ ] Visiting / (landing page) without login → works (public)
- [ ] Visiting /docs without login → works (public)
- [ ] Logout button → clears session, redirects to /login
- [ ] After logout, visiting /workflows → redirects to /login

## 6. Workflows Page (http://localhost:3000/workflows)

- [ ] Empty state shows "No Workflows Yet" with CTA
- [ ] Create a workflow via API:
  ```bash
  curl -X POST http://localhost:8000/workflows \
    -H "Authorization: Bearer <your_api_key>" \
    -H "Content-Type: application/json" \
    -d '{"name":"Welcome Email","event_name":"user-signup","definition":{}}'
  ```
- [ ] Refresh page → workflow appears in table
- [ ] Table shows: name, event_name, status (draft), last edited date

## 7. Subscribers Page (http://localhost:3000/subscribers)

- [ ] Empty state shows when no subscribers exist
- [ ] Create a subscriber via API:
  ```bash
  curl -X POST http://localhost:8000/subscribers \
    -H "Authorization: Bearer <your_api_key>" \
    -H "Content-Type: application/json" \
    -d '{"external_id":"user_1","email":"jane@example.com","name":"Jane Doe","channel_preferences":{"email":true,"in_app":true,"slack":false}}'
  ```
- [ ] Refresh page → subscriber appears in table
- [ ] Channel badges show correctly (green IN-APP, blue EMAIL, etc.)
- [ ] Search bar filters by name and email

## 8. Settings — API Keys (http://localhost:3000/settings)

- [ ] Initial server key from signup is listed
- [ ] Click "Create API Key" → modal opens (Step 1)
- [ ] Fill name ("Production") + select type → click "Create Key"
- [ ] Modal shows raw key (Step 2) with green monospace text
- [ ] Copy button copies key to clipboard
- [ ] Click "I've Saved My Key" → modal closes, key appears in table
- [ ] New key shows correct name, type, status (ACTIVE)
- [ ] Click "Revoke" → confirmation modal appears
- [ ] Confirm revoke → key status changes to REVOKED
- [ ] Revoked key's Revoke button is disabled
- [ ] Create a client key → shows "CLIENT" badge (yellow)

## 9. Settings — Providers (http://localhost:3000/settings/providers)

- [ ] Page loads with provider cards (may be empty)
- [ ] Connect Provider button is visible
- [ ] If providers exist, cards show channel badge + status

## 10. API Endpoints (via curl or Postman)

### Auth
- [ ] `POST /auth/signup` — creates user + team + API key
- [ ] `POST /auth/login` — returns JWT token
- [ ] `GET /auth/me` — returns user info (with valid JWT)
- [ ] `POST /auth/logout` — clears cookie

### Events
- [ ] `POST /events/trigger` — accepts workflow + subscriber_id + payload
- [ ] `POST /events/trigger` with `channels` param — filters channels
- [ ] `POST /events/trigger` with invalid channel → 422
- [ ] `POST /events/trigger` with `idempotency_key` → duplicate returns cached response

### Subscribers
- [ ] `POST /subscribers` — creates subscriber
- [ ] `GET /subscribers` — lists all team subscribers
- [ ] `GET /subscribers/{external_id}` — returns single subscriber
- [ ] `PATCH /subscribers/{external_id}` — updates fields
- [ ] `DELETE /subscribers/{external_id}` — soft deletes
- [ ] `GET /subscribers/{external_id}/preferences` — returns preferences
- [ ] `PATCH /subscribers/{external_id}/preferences` — updates preferences

### Workflows
- [ ] `POST /workflows` — creates workflow
- [ ] `GET /workflows` — lists workflows
- [ ] `GET /workflows/{id}` — returns single workflow
- [ ] `PUT /workflows/{id}` — updates (draft only)
- [ ] `POST /workflows/{id}/publish` — publishes (validates definition)
- [ ] `DELETE /workflows/{id}` — deletes workflow

### Notifications
- [ ] `GET /subscribers/{id}/notifications` — lists with pagination
- [ ] `GET /subscribers/{id}/notifications?channel=email` — filters by channel
- [ ] `PATCH /subscribers/{id}/notifications/{nid}` — marks read/archived
- [ ] `POST /subscribers/{id}/notifications/mark-all-read` — bulk mark read

### Teams & API Keys
- [ ] `POST /teams` — creates team + initial key
- [ ] `POST /teams/{id}/api-keys` — creates additional key with name
- [ ] `GET /teams/{id}/api-keys` — lists keys (name, last_used_at visible)
- [ ] `DELETE /teams/{id}/api-keys/{kid}` — revokes key

### Providers
- [ ] `POST /providers` — connects provider (config encrypted)
- [ ] `GET /providers` — lists providers (config NOT returned)
- [ ] `DELETE /providers/{id}` — disconnects provider

### Health
- [ ] `GET /health` — returns `{"status":"ok"}`

## 11. Cross-Cutting Concerns

- [ ] Rate limiting works (hit an endpoint 60+ times rapidly → 429)
- [ ] CORS allows requests from localhost:3000
- [ ] API key auth works (use `alrt_sk_...` in Authorization header)
- [ ] JWT auth works (dashboard login token accepted by all endpoints)
- [ ] Invalid/expired JWT → 401 Unauthorized
- [ ] Revoked API key → 401 Unauthorized
- [ ] Database auto-creates tables on fresh startup (delete DB, restart API)
