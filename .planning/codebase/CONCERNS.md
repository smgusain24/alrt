# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Resource Cleanup Issues:**
- Issue: Redis connections created in event trigger handler are not consistently closed on error paths
- Files: `apps/api/alrt/routes/events.py` (lines 37-43, 91-95, 100-128)
- Impact: Connection leaks if request fails mid-stream, leading to resource exhaustion under high load
- Fix approach: Use context managers (`async with` blocks) consistently for all Redis connections, or implement a connection pool wrapper

**Manual Celery Task Serialization:**
- Issue: Direct Celery message construction using raw JSON protocol (v2) instead of using Celery client library
- Files: `apps/api/alrt/routes/events.py` (lines 101-127)
- Impact: Fragile; breaks if Celery message format changes; hard to maintain; error handling is minimal
- Fix approach: Replace with `celery_app.send_task()` or equivalent, handle task enqueuing via dedicated service layer

**Broad Exception Handling:**
- Issue: Multiple catch-all `except Exception` handlers that log but don't distinguish error types
- Files: `apps/api/alrt/db.py` (lines 258, 274, 290, 306, 322), `apps/workers/alrt_workers/tasks/channels/inapp.py` (line 79), `apps/api/alrt/middleware/audit_log.py` (lines 36, 62, 80, 109, 137, 145)
- Impact: Difficult to debug; masks programming errors; retry logic applied indiscriminately
- Fix approach: Catch specific exceptions (asyncpg.Error, redis.Error, etc.); handle permanent vs. transient failures separately

**Hard-coded Magic Numbers:**
- Issue: Frequency cap expiration uses simplified midnight calculation
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 104-108)
- Impact: Not DST-aware; frequency cap may reset at wrong time in certain timezones
- Fix approach: Use proper timezone-aware midnight calculation or use Redis EXPIRE relative to request time

**Timezone Offset Parsing:**
- Issue: Manual parsing of non-standard UTC offset formats (UTC+HH:MM, UTC+HH.MM)
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 51-65)
- Impact: Fragile; doesn't handle all valid formats; can silently fall back to UTC on parse failure
- Fix approach: Use `zoneinfo` or `dateutil` for robust timezone parsing

**Resume Task Signature Mismatch:**
- Issue: `poll_scheduled_steps` calls `execute_step` with mismatched parameters (subscriber_id, team_id as None)
- Files: `apps/workers/alrt_workers/tasks/delay.py` (lines 25-32)
- Impact: Resumed steps may skip subscriber/team context-dependent logic (preferences, frequency caps, DND)
- Fix approach: Load full subscriber/workflow context before resuming; pass complete execution context to `execute_step`

---

## Known Bugs

**Delay Node Resume Loses Context:**
- Symptoms: Delayed steps (DND reschedule, frequency cap) when resumed, lose access to subscriber ID and team ID
- Files: `apps/workers/alrt_workers/tasks/delay.py` (line 25-32), `apps/workers/alrt_workers/tasks/step_runner.py` (line 17)
- Trigger: Schedule a delay or DND-triggered pause; when poll_scheduled_steps fires, execution continues but subscriber_id/team_id are None
- Workaround: Currently none; resume path incomplete
- Fix: Store full execution state in `scheduled_steps.payload` or load from DB on resume

**Cookie Security Misconfiguration:**
- Symptoms: JWT tokens exposed to JavaScript; can be stolen via XSS
- Files: `apps/api/alrt/routes/auth.py` (lines 54-56, 76-78)
- Trigger: Any XSS vulnerability in dashboard allows attacker to read cookie and impersonate user
- Workaround: None; design issue
- Fix: Set `httponly=True` on all JWT cookies; use HttpOnly flag with SameSite=Strict

**Idempotency Cache Race Condition:**
- Symptoms: Two concurrent trigger requests with same idempotency_key may both execute
- Files: `apps/api/alrt/routes/events.py` (lines 36-43, 91-95)
- Trigger: Client retries event trigger within same second; both requests check cache simultaneously before first write
- Workaround: None; timing issue
- Fix: Use Redis transaction (WATCH/MULTI/EXEC) or atomic CAS operation; or check-and-set in single Redis command

**Condition Operator Incompleteness:**
- Symptoms: Only three operators supported (equals, not_equals, exists); no numeric or string comparison operators
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 142-157)
- Trigger: Workflow with condition on numeric field (e.g., `amount > 100`) falls through as "ok" when operator is unsupported
- Workaround: Duplicating condition logic in payload templates
- Fix: Expand operator support (greater_than, less_than, contains, regex, etc.)

---

## Security Considerations

**API Key Hashing Vulnerability:**
- Risk: SHA-256 used for API key hashing; fast hash vulnerable to brute-force; should use bcrypt/argon2
- Files: `apps/api/alrt/deps.py` (line 30), `apps/api/alrt/middleware/rate_limit.py` (line 20)
- Current mitigation: API keys are long (minimum entropy ~128 bits); hash used for rate-limiting, not password auth
- Recommendations: For password-like secrets, switch to bcrypt; for rate-limiting, consider HMAC-SHA256 with server-side salt

**JWT Secret in Environment:**
- Risk: `settings.api_secret_key` read from environment; if compromised, all tokens become forged
- Files: `apps/api/alrt/auth.py` (line 35), `apps/api/alrt/deps.py` (lines 22, 47)
- Current mitigation: Secret should be stored in secure vault (not checked); rotations have no key versioning
- Recommendations: Implement key versioning (KID in JWT header); add secret rotation mechanism; use HashiCorp Vault or AWS Secrets Manager in production

**Provider Config Encryption Weak Key:**
- Risk: Fernet encryption key derived from single environment variable; no key rotation
- Files: `apps/workers/alrt_workers/utils/crypto.py`, `apps/workers/alrt_workers/tasks/channels/email.py` (line 47)
- Current mitigation: Key is long enough; payloads are small (API keys, bot tokens)
- Recommendations: Implement key versioning in encrypted payload format; add rotation procedure

**Slack Token Stored in JSONB:**
- Risk: Slack bot token stored encrypted in providers.config JSONB; SQL injection on provider queries could expose encrypted data
- Files: `apps/api/alrt/routes/providers.py`, `apps/workers/alrt_workers/tasks/channels/slack.py` (line 57)
- Current mitigation: Asyncpg uses parameterized queries; JSONB field is opaque to SQL
- Recommendations: Never log encrypted config; audit access to providers table

**Email Subject Truncation:**
- Risk: Subject line truncated to 500 chars without error; could mislead users about email intent
- Files: `apps/workers/alrt_workers/tasks/channels/email.py` (line 63), `apps/workers/alrt_workers/tasks/channels/inapp.py` (line 51)
- Current mitigation: Truncation is silent; subject is user-controlled template
- Recommendations: Warn in docs that subjects >500 chars are truncated; add validation in template preview endpoint

---

## Performance Bottlenecks

**Frequency Cap Check on Every Delivery:**
- Problem: Synchronous Redis `INCR` call for every in-app delivery when frequency cap enabled
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 101-110)
- Cause: Check-and-update is not batched; Redis latency ~1-5ms per delivery
- Improvement path: Batch frequency cap checks in `workflow.execute` task; fetch all subscriber frequency limits once

**Poll Scheduled Steps Queries DB Every 30 Seconds:**
- Problem: Celery Beat job runs `poll_scheduled_steps` every 30s; scans `scheduled_steps` table even if empty
- Files: `apps/workers/alrt_workers/tasks/delay.py` (lines 17-34)
- Cause: No index optimized for the full scan; will slow as table grows
- Improvement path: Add covering index on (status, scheduled_at); consider partitioning table by team_id

**Workflow Graph Walk Uses BFS Without Memoization:**
- Problem: BFS walk reconstructs node_map every execution; no caching of workflow structure
- Files: `apps/workers/alrt_workers/tasks/workflow.py` (line 50)
- Cause: Workflow definition is stored as JSONB; rebuilt on every execution
- Improvement path: Cache parsed workflow graph per team for duration of execution; invalidate on workflow publish

**Event Log Middleware Writes Synchronously:**
- Problem: Every API request triggers DB write via async middleware; no batching
- Files: `apps/api/alrt/middleware/audit_log.py`
- Cause: Each request logs immediately; if DB is slow, request latency increases
- Improvement path: Batch event logs; write to queue (Redis) and flush periodically; or use async background task

---

## Fragile Areas

**Workflow Definition Graph Validation Missing:**
- Files: `apps/api/alrt/routes/workflows.py`
- Why fragile: Users can create workflows with cycles, dangling nodes, or invalid node IDs; no validation on save/publish
- Safe modification: Always validate workflow graph on CREATE and PUBLISH:
  - Check no cycles (use DFS visited set)
  - Check all edges reference existing nodes
  - Check trigger node exists and is first
  - Check no isolated branches
- Test coverage: No tests for invalid workflow structures

**Delay Node Payload Propagation:**
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 127-139), `apps/workers/alrt_workers/tasks/delay.py`
- Why fragile: Payload is stored in `scheduled_steps` but not updated by parent steps; if parent step modifies payload, delayed step sees stale data
- Safe modification: Store snapshot of execution state (not just payload) in `scheduled_steps.payload`; merge with resumed payload
- Test coverage: No tests for multi-step workflows with delay + condition

**Channel Alias Normalization Incomplete:**
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 31-33)
- Why fragile: Only normalizes "inapp" and "in-app"; frontend may send other variants (in_app, inApp, InApp)
- Safe modification: Define canonical channel names; validate in schema; normalize early in routing
- Test coverage: No tests for channel name variants

**Do-Not-Disturb Edge Cases:**
- Files: `apps/workers/alrt_workers/tasks/step_runner.py` (lines 47-94)
- Why fragile:
  - Timezone string parsing can fail silently → defaults to UTC
  - Midnight boundary logic doesn't account for DST transitions
  - "Crosses midnight" logic assumes simple 24h interval (won't work for non-standard DND like 20:00-06:00)
- Safe modification: Use `pytz` or `zoneinfo` for timezone handling; test all DND scenarios (normal, crossing midnight, edge hours)
- Test coverage: Limited; only basic DND tested

**Celery Task Retry Logic Inconsistent:**
- Files: `apps/workers/alrt_workers/tasks/channels/email.py` (lines 88-102), `apps/workers/alrt_workers/tasks/channels/inapp.py` (lines 79-93), `apps/workers/alrt_workers/tasks/channels/slack.py` (lines 87-101)
- Why fragile: Retry decision logic differs across channels; no unified retry policy
- Safe modification: Consolidate retry logic into `@retry_handler` decorator or middleware
- Test coverage: Each channel has minimal retry testing

---

## Scaling Limits

**Database Connection Pool Small:**
- Current capacity: `min_size=2, max_size=10` (apps/api/alrt/db.py line 31)
- Limit: At 100+ concurrent requests, pool exhaustion occurs; requests wait for connection
- Scaling path: Increase max_size to 20-50 based on testing; monitor `asyncpg.pool` metrics; consider HikariCP-style adaptive pooling

**Redis Single Instance:**
- Current capacity: Single Redis instance (docker-compose.yml)
- Limit: No persistence (appendonly=false); no replication; single point of failure
- Scaling path: Implement Redis Sentinel or Cluster for HA; enable AOF persistence; separate cache from broker

**Idempotency Cache TTL Too Long:**
- Current capacity: 86400 seconds (24 hours) per idempotency key (events.py line 94)
- Limit: With millions of concurrent teams, Redis memory fills quickly
- Scaling path: Reduce TTL to 3600 seconds; archive old executions to cold storage; implement LRU eviction

**Event Log Table Growth Unbounded:**
- Current capacity: No retention policy; every API request appends to event_logs
- Limit: Table grows ~1M rows/day per active team; query latency degrades after 100M rows
- Scaling path: Add partition by `team_id`; implement monthly partitions with drop-old-partitions automation; OR use time-series DB (TimescaleDB)

**Scheduled Steps Table Accumulates:**
- Current capacity: No cleanup for completed/expired scheduled steps
- Limit: After months, table has millions of stale rows; poll query scans all
- Scaling path: Add cleanup job (delete completed steps >30 days old); add index on (status, team_id, scheduled_at); OR archive to separate table

---

## Dependencies at Risk

**SendGrid + Resend Dual Support:**
- Risk: Two email providers supported with different APIs; logic branches create test burden; hard to maintain compatibility
- Impact: Bug in one provider path affects production; migrating providers is manual
- Migration plan: Standardize on one provider (Resend recommended for simplicity); or abstract to unified email provider interface

**Redis Asyncio Deprecation Risk:**
- Risk: `redis.asyncio` is newer API; older `aioredis` still in use elsewhere; version mismatch possible
- Impact: If redis package drops asyncio support, need major refactor
- Migration plan: Standardize on `redis.asyncio`; remove `aioredis` imports; test Redis package upgrades in CI

**Celery v5 Broker Message Format:**
- Risk: Manual Celery v2 message format construction is brittle; Celery v6 may change format
- Impact: Task enqueuing breaks if Celery drops v2 protocol support
- Migration plan: Replace manual serialization with `celery_app.send_task()` API

---

## Missing Critical Features

**No Request Validation on Trigger Event:**
- Problem: `TriggerEvent.payload` is `dict[str, Any]`; no schema validation; can accept invalid JSON structures
- Blocks: Can't reliably template render; bad payloads cause silent template failures
- Fix: Define payload schema in Pydantic; validate at request time; return 400 with validation errors

**No Webhook Retries:**
- Problem: Outgoing webhooks (when implemented) will have no retry logic
- Blocks: Webhook notifications unreliable; third-party systems may miss events
- Fix: Add webhook retry queue with exponential backoff; store webhook execution logs

**No Circuit Breaker for Failing Providers:**
- Problem: If email provider API is down, all email deliveries fail; no fast-fail mechanism
- Blocks: Email delivery can degrade system performance (slow retries)
- Fix: Implement circuit breaker pattern; disable provider after N consecutive failures; alert admins

**No Bulk Event Trigger:**
- Problem: No API to trigger same workflow for multiple subscribers in one request
- Blocks: High-volume notification use cases require many API calls
- Fix: Add `POST /events/trigger-bulk` endpoint; accept array of subscriber IDs; enqueue batch tasks

**No Message Deduplication:**
- Problem: Same payload sent twice → two notifications; no deduplication logic
- Blocks: High-frequency workflows can spam users
- Fix: Implement content hash deduplication; store sent notification hashes; optionally deduplicate on (subscriber_id, workflow_id, payload_hash)

---

## Test Coverage Gaps

**Workflow Graph Edge Cases:**
- What's not tested: Cycles in workflow, dangling edges, missing trigger node, diamond patterns with complex conditions
- Files: `apps/workers/alrt_workers/tasks/workflow.py`
- Risk: Invalid workflows execute without error; could cause infinite loops or missing steps
- Priority: High

**Delay Node Resume Context:**
- What's not tested: Resume from delay with DND enabled; resume with frequency cap; resume with condition that was pending
- Files: `apps/workers/alrt_workers/tasks/delay.py`, `apps/workers/alrt_workers/tasks/step_runner.py`
- Risk: Resumed steps skip context-dependent logic
- Priority: High

**Timezone DND Edge Cases:**
- What's not tested: DND crossing midnight, DND in DST transition hours, non-UTC timezones with half-hour offsets
- Files: `apps/workers/alrt_workers/tasks/step_runner.py`
- Risk: Silent failures or incorrect DND application in certain timezones
- Priority: Medium

**Provider Config Encryption:**
- What's not tested: Decryption failures, malformed encrypted config, key rotation scenarios
- Files: `apps/workers/alrt_workers/utils/crypto.py`, `apps/workers/alrt_workers/tasks/channels/email.py`
- Risk: Silent decryption failures → notifications silently fail without error reason
- Priority: Medium

**API Rate Limiting:**
- What's not tested: Rate limit reset boundaries, concurrent request burst handling, API key vs. IP rate limits
- Files: `apps/api/alrt/middleware/rate_limit.py`
- Risk: Rate limits can be bypassed with concurrent requests
- Priority: Low

**Slack Block Kit Rendering:**
- What's not tested: Invalid block structures, deeply nested blocks, special characters in block text
- Files: `apps/workers/alrt_workers/tasks/channels/slack.py`
- Risk: Slack API rejects malformed blocks; silent delivery failure
- Priority: Low

---

*Concerns audit: 2026-02-28*
