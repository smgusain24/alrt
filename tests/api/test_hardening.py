"""Stream 5 hardening tests — audit scrub, SSRF validation, security headers,
WhatsApp HMAC, require_write coverage, and brute-force wiring."""

import hashlib
import hmac
import inspect
import json

import pytest

from alrt.config import settings
from alrt.middleware.audit_log import CREDENTIAL_PREFIXES, SENSITIVE_KEYS, _scrub


# ── 5.2 Audit-log credential scrub ────────────────────────────────

class TestAuditScrub:
    def test_top_level_secret_redacted(self):
        assert _scrub({"password": "hunter2", "email": "a@b.c"}) == {"password": "***", "email": "a@b.c"}

    def test_nested_secret_redacted(self):
        body = {"name": "smtp", "config": {"smtp_password": "x", "host": "mail"}}
        # 'config' itself is sensitive → fully redacted
        assert _scrub(body) == {"name": "smtp", "config": "***"}

    def test_deeply_nested_token_redacted(self):
        body = {"a": {"b": {"access_token": "t", "keep": 1}}}
        assert _scrub(body) == {"a": {"b": {"access_token": "***", "keep": 1}}}

    def test_list_of_dicts_scrubbed(self):
        body = {"items": [{"secret": "s", "id": 1}, {"id": 2}]}
        assert _scrub(body) == {"items": [{"secret": "***", "id": 1}, {"id": 2}]}

    def test_case_insensitive_keys(self):
        assert _scrub({"API_KEY": "x"}) == {"API_KEY": "***"}

    def test_credential_prefixes_cover_providers_and_channels(self):
        assert "/providers" in CREDENTIAL_PREFIXES
        assert "/channels" in CREDENTIAL_PREFIXES
        assert "config" in SENSITIVE_KEYS

    def test_discord_webhook_url_redacted(self):
        # a Discord webhook URL is a bearer secret — must not land in event_logs
        body = {"external_id": "u1", "discord_webhook_url": "https://discord.com/api/webhooks/1/tok"}
        assert _scrub(body) == {"external_id": "u1", "discord_webhook_url": "***"}


# ── 5.6 Security headers ──────────────────────────────────────────

class TestSecurityHeaders:
    async def test_headers_on_normal_response(self, client):
        resp = await client.get("/health")
        assert resp.headers["X-Content-Type-Options"] == "nosniff"
        assert resp.headers["X-Frame-Options"] == "DENY"
        assert "Strict-Transport-Security" in resp.headers
        assert "frame-ancestors 'none'" in resp.headers["Content-Security-Policy"]

    async def test_csp_exempt_on_openapi(self, client):
        resp = await client.get("/openapi.json")
        # docs assets need a CDN — strict CSP is skipped there
        assert "Content-Security-Policy" not in resp.headers
        # base headers still apply
        assert resp.headers["X-Content-Type-Options"] == "nosniff"


# ── 5.3 SSRF: subscriber discord_webhook_url validation ───────────

class TestDiscordWebhookValidation:
    async def test_bad_webhook_rejected(self, client):
        resp = await client.post("/subscribers", json={
            "external_id": "u1",
            "discord_webhook_url": "http://169.254.169.254/api/webhooks/1/x",
        })
        assert resp.status_code == 422

    async def test_non_discord_host_rejected(self, client):
        resp = await client.post("/subscribers", json={
            "external_id": "u1",
            "discord_webhook_url": "https://evil.com/api/webhooks/1/x",
        })
        assert resp.status_code == 422


# ── 5.5 WhatsApp webhook HMAC ─────────────────────────────────────

class TestWhatsAppHmac:
    _URL = "/channels/webhooks/whatsapp"

    async def test_bad_signature_rejected(self, client, monkeypatch):
        monkeypatch.setattr(settings, "whatsapp_app_secret", "sekret")
        body = json.dumps({"object": "whatsapp_business_account", "entry": []}).encode()
        resp = await client.post(self._URL, content=body,
                                 headers={"X-Hub-Signature-256": "sha256=deadbeef"})
        assert resp.status_code == 403

    async def test_missing_signature_rejected(self, client, monkeypatch):
        monkeypatch.setattr(settings, "whatsapp_app_secret", "sekret")
        body = json.dumps({"object": "whatsapp_business_account", "entry": []}).encode()
        resp = await client.post(self._URL, content=body)
        assert resp.status_code == 403

    async def test_valid_signature_accepted(self, client, monkeypatch):
        monkeypatch.setattr(settings, "whatsapp_app_secret", "sekret")
        body = json.dumps({"object": "whatsapp_business_account", "entry": []}).encode()
        sig = "sha256=" + hmac.new(b"sekret", body, hashlib.sha256).hexdigest()
        resp = await client.post(self._URL, content=body,
                                 headers={"X-Hub-Signature-256": sig})
        assert resp.status_code == 200

    async def test_unset_secret_skips_verification_in_dev(self, client, monkeypatch):
        monkeypatch.setattr(settings, "whatsapp_app_secret", "")
        monkeypatch.setattr(settings, "environment", "development")
        body = json.dumps({"object": "whatsapp_business_account", "entry": []}).encode()
        resp = await client.post(self._URL, content=body)
        assert resp.status_code == 200

    async def test_unset_secret_fails_closed_in_production(self, client, monkeypatch):
        monkeypatch.setattr(settings, "whatsapp_app_secret", "")
        monkeypatch.setattr(settings, "environment", "production")
        body = json.dumps({"object": "whatsapp_business_account", "entry": []}).encode()
        resp = await client.post(self._URL, content=body)
        assert resp.status_code == 403


# ── 5.7 require_write wiring on mutation routes ───────────────────

def _flat_deps(dependant):
    calls, stack = [], list(dependant.dependencies)
    while stack:
        d = stack.pop()
        calls.append(d.call)
        stack.extend(d.dependencies)
    return calls


def _find_route(app, path, method):
    for r in app.routes:
        if getattr(r, "path", None) == path and method in getattr(r, "methods", set()):
            return r
    return None


class TestRequireWriteWiring:
    @pytest.mark.parametrize("path,method", [
        ("/channels/discord/config", "PUT"),
        ("/teams/{team_id}/api-keys/{key_id}", "DELETE"),
        ("/subscribers/{external_id}/token", "POST"),
        # coverage lock on already-guarded routes
        ("/subscribers", "POST"),
        ("/providers", "POST"),
        ("/workflows", "POST"),
    ])
    def test_route_requires_write(self, path, method):
        from alrt.main import app
        from alrt.deps import require_write

        route = _find_route(app, path, method)
        assert route is not None, f"{method} {path} not found"
        assert require_write in _flat_deps(route.dependant), f"{method} {path} missing require_write"


# ── 5.4 Brute-force limits wiring ─────────────────────────────────

class TestBruteForceWiring:
    def test_auth_limit_config_default(self):
        assert settings.rate_limit_auth == "5/minute"

    def test_auth_routes_accept_request(self):
        from alrt.routes.auth import login, signup
        # slowapi's @limiter.limit requires a `request: Request` parameter
        assert "request" in inspect.signature(login).parameters
        assert "request" in inspect.signature(signup).parameters
