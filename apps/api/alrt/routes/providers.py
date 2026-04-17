"""Provider CRUD and Slack OAuth integration.

Providers represent BYOC (bring-your-own-credentials) channel configurations.
Sensitive fields (API keys, tokens) are Fernet-encrypted before storage.
This module also duplicates the Slack OAuth flow from ``channels.py`` so
that providers can be created via the ``/providers`` prefix.
"""

import json
import uuid
import urllib.parse

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from alrt.config import settings
from alrt.db import execute_read_query, execute_read_one_query, execute_insert_query, execute_delete_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.provider import CreateProvider, ProviderResponse
from alrt.queries import providers as prov_q

router = APIRouter(prefix="/providers", tags=["providers"])


def _get_fernet():
    """Build a Fernet cipher from the app's encryption key."""
    return Fernet(settings.encryption_key.encode())


def _encrypt_config(config: dict) -> dict:
    """Fernet-encrypt a config dict and wrap it for JSONB storage."""
    f = _get_fernet()
    encrypted = f.encrypt(json.dumps(config).encode()).decode()
    return {"encrypted": encrypted}


def _decrypt_config(config: dict) -> dict:
    """Decrypt a previously encrypted config dict."""
    f = _get_fernet()
    return json.loads(f.decrypt(config["encrypted"].encode()))


@router.post("", response_model=ProviderResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_provider(
    request: Request,
    body: CreateProvider,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Create a BYOC provider for a channel, encrypting its credentials."""
    encrypted_config = _encrypt_config(body.config)
    row = await execute_insert_query(
        prov_q.CREATE,
        [uuid.uuid4(), team_id, body.channel, body.provider_type, encrypted_config],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create provider")
    return ProviderResponse.model_validate(row)


@router.get("", response_model=list[ProviderResponse])
@limiter.limit(settings.rate_limit_read)
async def list_providers(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """List all providers configured for the authenticated team."""
    rows = await execute_read_query(prov_q.LIST_BY_TEAM, [team_id])
    return [ProviderResponse.model_validate(row) for row in rows]


@router.delete("/{provider_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_provider(
    request: Request,
    provider_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Delete a provider by ID, scoped to the authenticated team."""
    provider = await execute_read_one_query(prov_q.FIND_BY_ID, [provider_id, team_id])
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    await execute_delete_query(prov_q.DELETE, [provider_id, team_id])


# ─── Slack OAuth ───

SLACK_OAUTH_SCOPES = "chat:write,users:read"


@router.get("/slack/connect")
async def slack_oauth_connect(token: str | None = None):
    """Redirect user to Slack's OAuth authorization page."""
    if not settings.slack_client_id:
        raise HTTPException(status_code=500, detail="Slack OAuth not configured. Set SLACK_CLIENT_ID in env.")

    # Resolve team_id from the JWT token passed as query param
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

    # Encrypt team_id into state param so we know which team on callback
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
async def slack_oauth_callback(
    code: str,
    state: str,
):
    """Handle Slack OAuth callback — exchange code for bot token and store as provider."""
    if not settings.slack_client_id or not settings.slack_client_secret:
        raise HTTPException(status_code=500, detail="Slack OAuth not configured")

    # Decrypt state to get team_id
    try:
        f = _get_fernet()
        team_id = uuid.UUID(f.decrypt(state.encode()).decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Exchange code for token
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

    # Extract bot token and workspace info
    bot_token = data.get("access_token")
    workspace_name = data.get("team", {}).get("name", "Slack Workspace")
    workspace_id = data.get("team", {}).get("id", "")

    # Store as encrypted provider
    encrypted_config = _encrypt_config({
        "bot_token": bot_token,
        "workspace_name": workspace_name,
        "workspace_id": workspace_id,
    })

    await execute_insert_query(prov_q.CREATE, [
        uuid.uuid4(), team_id, "slack", "slack_oauth", encrypted_config,
    ])

    return RedirectResponse(f"{settings.dashboard_url}/settings/providers?connected=slack")
