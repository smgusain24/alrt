"""Alrt client — sync and async."""
from __future__ import annotations

from typing import Any

import httpx

from alrt_sdk.errors import raise_for_status
from alrt_sdk.retry import is_retryable, get_retry_delay, sync_sleep, async_sleep
from alrt_sdk.resources.events import EventsResource, AsyncEventsResource
from alrt_sdk.resources.subscribers import SubscribersResource, AsyncSubscribersResource

DEFAULT_BASE_URL = "https://api.alrt.dev"
DEFAULT_MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30.0


class Alrt:
    """Synchronous alrt client."""

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        max_retries: int = DEFAULT_MAX_RETRIES,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._max_retries = max_retries
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        self.events = EventsResource(self._request)
        self.subscribers = SubscribersResource(self._request)

    def _request(
        self,
        method: str,
        path: str,
        json: dict | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        headers: dict[str, str] = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        for attempt in range(self._max_retries + 1):
            response = self._client.request(method, path, json=json, headers=headers)

            if response.is_success:
                if response.status_code == 204:
                    return None
                return response.json()

            if is_retryable(response.status_code) and attempt < self._max_retries:
                retry_after = response.headers.get("retry-after")
                delay = get_retry_delay(attempt, retry_after)
                sync_sleep(delay)
                continue

            retry_after_header = response.headers.get("retry-after")
            retry_after_val = int(retry_after_header) if retry_after_header else None
            raise_for_status(response.status_code, response.text, retry_after_val)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "Alrt":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


class AsyncAlrt:
    """Asynchronous alrt client."""

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        max_retries: int = DEFAULT_MAX_RETRIES,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._max_retries = max_retries
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        self.events = AsyncEventsResource(self._request)
        self.subscribers = AsyncSubscribersResource(self._request)

    async def _request(
        self,
        method: str,
        path: str,
        json: dict | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        headers: dict[str, str] = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        for attempt in range(self._max_retries + 1):
            response = await self._client.request(method, path, json=json, headers=headers)

            if response.is_success:
                if response.status_code == 204:
                    return None
                return response.json()

            if is_retryable(response.status_code) and attempt < self._max_retries:
                retry_after = response.headers.get("retry-after")
                delay = get_retry_delay(attempt, retry_after)
                await async_sleep(delay)
                continue

            retry_after_header = response.headers.get("retry-after")
            retry_after_val = int(retry_after_header) if retry_after_header else None
            raise_for_status(response.status_code, response.text, retry_after_val)

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncAlrt":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
