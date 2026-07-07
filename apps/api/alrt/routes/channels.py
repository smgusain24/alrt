"""Channel-specific OAuth flows and webhook handlers.

Contains Slack OAuth connect/callback, Discord webhook configuration,
and WhatsApp Cloud API webhook verification and status updates.
"""

import hashlib
import hmac
import json
import logging
import urllib.parse
import uuid

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from alrt.config import settings
from alrt.db import execute_insert_query, execute_update_query
from alrt.deps import get_current_team, require_write
from alrt.middleware.rate_limit import limiter
from alrt.queries import providers as prov_q

log = logging.getLogger("alrt.channels")

router = APIRouter(prefix="/channels", tags=["channels"])

# WhatsApp webhook query: update notification status by wamid stored in payload JSONB
Q_UPDATE_WHATSAPP_STATUS = """
    UPDATE notifications
    SET status = $2,
        error_reason = COALESCE($3, error_reason),
        updated_at = now()
    WHERE payload->>'wamid' = $1
"""

SLACK_OAUTH_SCOPES = "chat:write,users:read"


def _get_fernet():
    """Build a Fernet cipher from the app's encryption key."""
    return Fernet(settings.encryption_key.encode())


def _encrypt_config(config: dict) -> dict:
    """Fernet-encrypt a config dict and wrap it for JSONB storage."""
    f = _get_fernet()
    encrypted = f.encrypt(json.dumps(config).encode()).decode()
    return {"encrypted": encrypted}


# --- Slack OAuth ---

@router.get("/slack/connect")
async def slack_oauth_connect(token: str | None = None):
    """Redirect to Slack's OAuth authorization page."""
    if not settings.slack_client_id:
        raise HTTPException(status_code=500, detail="Slack OAuth not configured. Set SLACK_CLIENT_ID.")
    if not token:
        raise HTTPException(status_code=401, detail="Token required")

    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.api_secret_key, algorithms=["HS256"])
        team_id = payload.get("team_id")
        if not team_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    f = _get_fernet()
    state = f.encrypt(team_id.encode()).decode()

    params = urllib.parse.urlencode({
        "client_id": settings.slack_client_id,
        "scope": SLACK_OAUTH_SCOPES,
        "redirect_uri": settings.slack_redirect_uri,
        "state": state,
    })
    return RedirectResponse(f"https://slack.com/oauth/v2/authorize?{params}")


@router.get("/slack/callback")
async def slack_oauth_callback(code: str, state: str):
    """Handle Slack OAuth callback — exchange code for token, upsert provider."""
    if not settings.slack_client_id or not settings.slack_client_secret:
        raise HTTPException(status_code=500, detail="Slack OAuth not configured")

    try:
        f = _get_fernet()
        team_id = uuid.UUID(f.decrypt(state.encode()).decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": settings.slack_client_id,
                "client_secret": settings.slack_client_secret,
                "code": code,
                "redirect_uri": settings.slack_redirect_uri,
            },
        )
        data = resp.json()

    if not data.get("ok"):
        error = data.get("error", "unknown_error")
        return RedirectResponse(f"{settings.dashboard_url}/settings/providers?error={error}")

    bot_token = data.get("access_token")
    workspace_name = data.get("team", {}).get("name", "Slack Workspace")
    workspace_id = data.get("team", {}).get("id", "")

    encrypted_config = _encrypt_config({
        "bot_token": bot_token,
        "workspace_name": workspace_name,
        "workspace_id": workspace_id,
    })

    await execute_insert_query(prov_q.UPSERT_SLACK, [
        uuid.uuid4(), team_id, encrypted_config,
    ])

    return RedirectResponse(f"{settings.dashboard_url}/settings/providers?connected=slack")


# --- Discord Webhook Config ---

@router.put("/discord/config")
@limiter.limit(settings.rate_limit_write)
async def update_discord_config(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
    _: dict = Depends(require_write),
):
    """Save the Discord webhook URL for the team's Discord provider.

    Body: { "webhook_url": "https://discord.com/api/webhooks/..." }
    """
    body = await request.json()
    webhook_url = body.get("webhook_url", "").strip()
    if not webhook_url:
        raise HTTPException(status_code=422, detail="webhook_url is required")
    if not webhook_url.startswith("https://discord.com/api/webhooks/"):
        raise HTTPException(status_code=422, detail="Invalid Discord webhook URL")

    encrypted_config = _encrypt_config({"webhook_url": webhook_url})

    await execute_insert_query(
        prov_q.CREATE,
        [uuid.uuid4(), team_id, "discord", "discord", encrypted_config],
    )
    return {"channel": "discord", "is_active": True}


# --- WhatsApp Webhooks ---

def _whatsapp_verify_token() -> str:
    """Meta GET-challenge verify token; falls back to the legacy derived value."""
    return settings.whatsapp_verify_token or settings.encryption_key[:16]


def _verify_whatsapp_signature(request: Request, raw: bytes) -> bool:
    """Verify Meta's X-Hub-Signature-256 HMAC over the raw request body.

    Returns True when the signature matches. When no app secret is configured,
    verification is skipped (dev/optional-config) and a warning is logged.
    """
    secret = settings.whatsapp_app_secret
    if not secret:
        # Fail closed in production so a forgotten env var can't silently disable
        # the control; fail open elsewhere so dev/self-hosted works without it.
        if settings.environment == "production":
            log.error("WhatsApp webhook rejected: WHATSAPP_APP_SECRET is required in production")
            return False
        log.warning("WhatsApp webhook signature NOT verified: WHATSAPP_APP_SECRET is unset")
        return True

    sig = request.headers.get("X-Hub-Signature-256", "")
    if not sig.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected)


@router.get("/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """Handle Meta webhook verification challenge (GET hub.challenge)."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == _whatsapp_verify_token():
        return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    """Handle Meta WhatsApp webhook delivery status updates (sent/delivered/read/failed).

    Rejects forged callbacks by verifying Meta's HMAC signature over the raw body.
    Status rows are matched by the Meta message id (``wamid``), which is globally
    unique per message, so an update only ever touches the sending team's row.
    """
    raw = await request.body()
    if not _verify_whatsapp_signature(request, raw):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if body.get("object") != "whatsapp_business_account":
        return {"ok": True}

    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for status_update in value.get("statuses", []):
                wamid = status_update.get("id")
                status = status_update.get("status")
                if not wamid or not status:
                    continue

                status_map = {
                    "sent": "sent",
                    "delivered": "delivered",
                    "read": "read",
                    "failed": "failed",
                }
                alrt_status = status_map.get(status)
                if not alrt_status:
                    continue

                error_reason = None
                if status == "failed":
                    errors = status_update.get("errors", [])
                    error_reason = errors[0].get("message", "Unknown error") if errors else "Unknown error"

                await execute_update_query(
                    Q_UPDATE_WHATSAPP_STATUS,
                    [wamid, alrt_status, error_reason],
                )

    return {"ok": True}
