"""Tests for the provider-config cache (get_provider)."""
import uuid

import alrt_workers.providers_cache as pc


class _FakeRedis:
    """Minimal sync Redis stand-in (bytes-returning get, ttl-ignoring set)."""

    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value, ex=None):
        self.store[key] = value.encode() if isinstance(value, str) else value


def test_second_lookup_served_from_cache(monkeypatch):
    """A second lookup for the same team+channel skips the DB fetch."""
    fake = _FakeRedis()
    monkeypatch.setattr(pc, "_get_cache_client", lambda: fake)
    calls = []

    def fetch():
        calls.append(1)
        return {"id": str(uuid.uuid4()), "provider_type": "resend", "config": {"encrypted": "blob"}}

    first = pc.get_provider("team-1", "email", fetch)
    second = pc.get_provider("team-1", "email", fetch)

    assert len(calls) == 1          # fetched once, cached thereafter
    assert first == second          # cache round-trips the row faithfully


def test_disabled_cache_always_fetches(monkeypatch):
    """With no cache client (disabled/unavailable), every call hits the DB."""
    monkeypatch.setattr(pc, "_get_cache_client", lambda: None)
    calls = []

    def fetch():
        calls.append(1)
        return {"id": "x"}

    pc.get_provider("team-1", "email", fetch)
    pc.get_provider("team-1", "email", fetch)
    assert len(calls) == 2


def test_cache_error_falls_back_to_fetch(monkeypatch):
    """A Redis failure never breaks delivery — it falls through to the DB."""
    class _BrokenRedis:
        def get(self, key):
            raise RuntimeError("redis down")

        def set(self, key, value, ex=None):
            raise RuntimeError("redis down")

    monkeypatch.setattr(pc, "_get_cache_client", lambda: _BrokenRedis())
    row = pc.get_provider("team-1", "email", lambda: {"id": "ok"})
    assert row == {"id": "ok"}


def test_disable_env_returns_no_client(monkeypatch):
    """DISABLE_PROVIDER_CACHE turns the cache off."""
    monkeypatch.setenv("DISABLE_PROVIDER_CACHE", "1")
    # reset the module memoization so the env change takes effect
    monkeypatch.setattr(pc, "_client_initialized", False)
    monkeypatch.setattr(pc, "_client", None)
    assert pc._get_cache_client() is None
