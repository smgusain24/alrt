"""Short-TTL cache for provider rows, keyed by team + channel.

Provider config is invariant per (team, channel) yet every channel send re-fetches
it. This caches the row on the cache Redis (``CACHE_REDIS_URL``, falling back to
``REDIS_URL``) so repeated sends skip the DB round-trip.

The cached row still carries the **encrypted** config — decryption stays in the
worker at send time, so nothing here widens secret exposure. The cache is
best-effort: any Redis failure falls straight through to the DB fetch, and the
whole layer is disabled when ``DISABLE_PROVIDER_CACHE`` is set (tests, or as a
kill switch).
"""

import json
import os

import redis

from alrt_workers.serialization import json_safe

PROVIDER_TTL_SECONDS = 120

_client = None
_client_initialized = False


def _get_cache_client():
    """Return a module-cached Redis client, or None if caching is disabled/unset."""
    global _client, _client_initialized
    if os.getenv("DISABLE_PROVIDER_CACHE"):
        return None
    if not _client_initialized:
        _client_initialized = True
        url = os.getenv("CACHE_REDIS_URL") or os.getenv("REDIS_URL")
        _client = redis.Redis.from_url(url) if url else None
    return _client


def get_provider(team_id, channel, fetch_fn):
    """Return the provider row for (team_id, channel), cached briefly.

    Args:
        team_id: team UUID (or its str form) — used only in the cache key.
        channel: channel name, e.g. "email".
        fetch_fn: zero-arg callable that returns the provider row from the DB.
            Called on a cache miss (and on any cache error) — keep the DB query
            inside it so callers/tests keep a single fetch seam.
    """
    key = f"provider:{team_id}:{channel}"
    client = _get_cache_client()

    if client is not None:
        try:
            cached = client.get(key)
            if cached is not None:
                return json.loads(cached)
        except Exception:
            pass  # cache down — fall through to the DB

    row = fetch_fn()

    if row is not None and client is not None:
        try:
            client.set(key, json.dumps(json_safe(row)), ex=PROVIDER_TTL_SECONDS)
        except Exception:
            pass  # caching is best-effort
    return row
