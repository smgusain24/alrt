import hashlib
import hmac
import json
import time
import urllib.parse
import uuid

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from alrt.config import settings
from alrt.db import execute_read_query, execute_insert_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import providers as prov_q

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
    return Fernet(settings.encryption_key.encode())


def _encrypt_config(config: dict) -> dict:
    f = _get_fernet()
    encrypted = f.encrypt(json.dumps(config).encode()).decode()
    return {"encrypted": encrypted}


async def _verify_slack_signature(request: Request) -> bool:
    """Verify Slack Events API payload using HMAC-SHA256."""
    if not settings.slack_signing_secret:
        return True  # Dev mode: skip verification if secret not configured
    timestamp = request.headers.get("X-Slack-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    if not timestamp or not signature:
        return False
    try:
        if abs(time.time() - float(timestamp)) > 300:
            return False  # Replay attack protection
    except ValueError:
        return False
    body = await request.body()
    sig_base = f"v0:{timestamp}:{body.decode()}"
    expected = "v0=" + hmac.new(
        settings.slack_signing_secret.encode(),
        sig_base.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _verify_whatsapp_signature(request: Request) -> bool:
    """Verify Meta webhook payload using HMAC-SHA256 (X-Hub-Signature-256)."""
    if not settings.whatsapp_app_secret:
        return True  # Dev mode: skip verification if secret not configured
    signature = request.headers.get("X-Hub-Signature-256", "")
    if not signature:
        return False
    body = await request.body()
    expected = "sha256=" + hmac.new(
        settings.whatsapp_app_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# --- GET /channels --- Team's channel connection status ---

@router.get("")
@limiter.limit(settings.rate_limit_read)
async def get_channels_status(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Return the alrt_hosted channel status for the team."""
    rows = await execute_read_query(prov_q.GET_CHANNELS_STATUS, [team_id])
    return [dict(row) for row in rows]


# --- Slack OAuth ---

@router.get("/slack/connect")
async def slack_oauth_connect(token: str | None = None):
    """Redirect to Slack's OAuth authorization page using alrt's app credentials."""
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
    """Handle Slack OAuth callback — exchange code for token, upsert alrt_hosted provider."""
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

    # Encrypt config: bot_token is a secret; workspace_name + workspace_id are metadata
    encrypted_config = _encrypt_config({
        "bot_token": bot_token,
        "workspace_name": workspace_name,
        "workspace_id": workspace_id,
    })

    # UPSERT: handles both first-time connect and reconnect cases
    await execute_insert_query(prov_q.UPSERT_SLACK_ALRT_HOSTED, [
        uuid.uuid4(), team_id, encrypted_config,
    ])

    return RedirectResponse(f"{settings.dashboard_url}/settings/providers?connected=slack")


# --- Slack Events API ---

@router.post("/slack/events")
async def slack_events(request: Request):
    """Handle Slack Events API callbacks (tokens_revoked, url_verification)."""
    # Verify signature BEFORE reading body as JSON
    if not await _verify_slack_signature(request):
        raise HTTPException(status_code=403, detail="Invalid Slack signature")

    body = await request.json()

    # URL verification challenge (required during Slack app Events API setup)
    if body.get("type") == "url_verification":
        return {"challenge": body["challenge"]}

    event = body.get("event", {})
    if event.get("type") == "tokens_revoked":
        # Use Slack's workspace_id (team_id in Slack terminology) to find the provider
        # NOTE: tokens_revoked payload contains user IDs (not token strings) in tokens.bot[]
        # Use the top-level team_id field to identify which workspace was revoked
        workspace_id = body.get("team_id")
        if workspace_id:
            await execute_update_query(
                prov_q.DEACTIVATE_SLACK_BY_WORKSPACE,
                [workspace_id],
            )

    return {"ok": True}


# --- WhatsApp Activation ---

@router.post("/whatsapp/activate")
@limiter.limit(settings.rate_limit_write)
async def activate_whatsapp(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Activate the alrt_hosted WhatsApp channel for the team.

    If no provider row exists yet (e.g. team was created before Phase 4), inserts a placeholder
    first, then activates it. Uses the ACTIVATE_ALRT_HOSTED_CHANNEL upsert-style UPDATE.
    """
    import json as _json
    extra_config = _json.dumps({"status": "active"})
    rows = await execute_update_query(
        prov_q.ACTIVATE_ALRT_HOSTED_CHANNEL,
        [team_id, "whatsapp", extra_config],
    )
    if not rows:
        # No existing row — insert placeholder and activate
        await execute_insert_query(
            prov_q.CREATE_ALRT_HOSTED_WHATSAPP,
            [uuid.uuid4(), team_id],
        )
        await execute_update_query(
            prov_q.ACTIVATE_ALRT_HOSTED_CHANNEL,
            [team_id, "whatsapp", extra_config],
        )
    return {"channel": "whatsapp", "is_active": True}


@router.post("/whatsapp/deactivate")
@limiter.limit(settings.rate_limit_write)
async def deactivate_whatsapp(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Deactivate the alrt_hosted WhatsApp channel for the team."""
    import json as _json
    await execute_update_query(
        """UPDATE providers SET is_active = false, updated_at = now()
           WHERE team_id = $1 AND channel = 'whatsapp' AND provider_type = 'alrt_hosted'""",
        [team_id],
    )
    return {"channel": "whatsapp", "is_active": False}


# --- Discord Webhook Config ---

@router.put("/discord/config")
@limiter.limit(settings.rate_limit_write)
async def update_discord_config(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Save the Discord webhook URL for the team's alrt_hosted Discord provider.

    Body: { "webhook_url": "https://discord.com/api/webhooks/..." }
    Inserts a placeholder row if none exists, then stores the encrypted webhook URL.
    """
    import json as _json
    body = await request.json()
    webhook_url = body.get("webhook_url", "").strip()
    if not webhook_url:
        raise HTTPException(status_code=422, detail="webhook_url is required")
    if not webhook_url.startswith("https://discord.com/api/webhooks/"):
        raise HTTPException(status_code=422, detail="Invalid Discord webhook URL")

    # Encrypt the webhook URL before storing
    encrypted_config = _encrypt_config({"webhook_url": webhook_url})
    extra_config = _json.dumps({"status": "active", **encrypted_config})

    rows = await execute_update_query(
        prov_q.ACTIVATE_ALRT_HOSTED_CHANNEL,
        [team_id, "discord", extra_config],
    )
    if not rows:
        # No existing row — insert placeholder first
        await execute_insert_query(
            prov_q.CREATE_ALRT_HOSTED_DISCORD,
            [uuid.uuid4(), team_id],
        )
        await execute_update_query(
            prov_q.ACTIVATE_ALRT_HOSTED_CHANNEL,
            [team_id, "discord", extra_config],
        )
    return {"channel": "discord", "is_active": True}


# --- WhatsApp Webhooks ---

@router.get("/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """Handle Meta webhook verification challenge (GET hub.challenge)."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    # Reuse whatsapp_app_secret as the verify_token for simplicity
    verify_token = settings.whatsapp_app_secret
    if mode == "subscribe" and token == verify_token:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    """Handle Meta WhatsApp webhook delivery status updates (sent/delivered/read/failed)."""
    # Verify X-Hub-Signature-256 BEFORE reading body as JSON (same HMAC pattern as Slack)
    if not await _verify_whatsapp_signature(request):
        raise HTTPException(status_code=403, detail="Invalid signature")

    body = await request.json()

    if body.get("object") != "whatsapp_business_account":
        return {"ok": True}

    # Process status updates from each entry in the webhook payload
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for status_update in value.get("statuses", []):
                wamid = status_update.get("id")
                status = status_update.get("status")  # sent | delivered | read | failed
                if not wamid or not status:
                    continue

                # Map Meta status to alrt notification status
                status_map = {
                    "sent": "sent",
                    "delivered": "delivered",
                    "read": "read",
                    "failed": "failed",
                }
                alrt_status = status_map.get(status)
                if not alrt_status:
                    continue

                # Extract error reason for failed status
                error_reason = None
                if status == "failed":
                    errors = status_update.get("errors", [])
                    error_reason = errors[0].get("message", "Unknown error") if errors else "Unknown error"

                # Find and update the notification by wamid stored in payload JSONB
                await execute_update_query(
                    Q_UPDATE_WHATSAPP_STATUS,
                    [wamid, alrt_status, error_reason],
                )

    return {"ok": True}
