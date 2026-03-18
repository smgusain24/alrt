"""Subscribers resource — CRUD, preferences, push tokens."""
from __future__ import annotations

from typing import Any, Callable, Awaitable
from urllib.parse import quote

from alrt_sdk.types import (
    CreateSubscriberRequest,
    UpdateSubscriberRequest,
    SubscriberResponse,
    RegisterPushTokenRequest,
    PushTokenResponse,
    PreferencesResponse,
)


class SubscribersResource:
    def __init__(self, request: Callable[..., Any]) -> None:
        self._request = request

    def create(self, **kwargs: Any) -> SubscriberResponse:
        params = CreateSubscriberRequest(**kwargs)
        body = params.model_dump(by_alias=True, exclude_none=True)
        raw = self._request("POST", "/subscribers", json=body)
        return SubscriberResponse.model_validate(raw)

    def list(self, limit: int = 20, offset: int = 0) -> list[SubscriberResponse]:
        raw = self._request("GET", f"/subscribers?limit={limit}&offset={offset}")
        items = raw if isinstance(raw, list) else []
        return [SubscriberResponse.model_validate(r) for r in items]

    def get(self, subscriber_id: str) -> SubscriberResponse:
        raw = self._request("GET", f"/subscribers/{quote(subscriber_id)}")
        return SubscriberResponse.model_validate(raw)

    def update(self, subscriber_id: str, **kwargs: Any) -> SubscriberResponse:
        params = UpdateSubscriberRequest(**kwargs)
        body = params.model_dump(by_alias=True, exclude_none=True)
        raw = self._request("PATCH", f"/subscribers/{quote(subscriber_id)}", json=body)
        return SubscriberResponse.model_validate(raw)

    def delete(self, subscriber_id: str) -> None:
        self._request("DELETE", f"/subscribers/{quote(subscriber_id)}")

    def get_preferences(self, subscriber_id: str) -> PreferencesResponse:
        raw = self._request("GET", f"/subscribers/{quote(subscriber_id)}/preferences")
        return PreferencesResponse.model_validate(raw)

    def update_preferences(self, subscriber_id: str, preferences: dict) -> PreferencesResponse:
        raw = self._request("PATCH", f"/subscribers/{quote(subscriber_id)}/preferences", json=preferences)
        return PreferencesResponse.model_validate(raw)

    def register_push_token(self, subscriber_id: str, **kwargs: Any) -> list[PushTokenResponse]:
        params = RegisterPushTokenRequest(**kwargs)
        body = params.model_dump(by_alias=True, exclude_none=True)
        raw = self._request("POST", f"/subscribers/{quote(subscriber_id)}/push-tokens", json=body)
        items = raw if isinstance(raw, list) else []
        return [PushTokenResponse.model_validate(r) for r in items]

    def list_push_tokens(self, subscriber_id: str) -> list[PushTokenResponse]:
        raw = self._request("GET", f"/subscribers/{quote(subscriber_id)}/push-tokens")
        items = raw if isinstance(raw, list) else []
        return [PushTokenResponse.model_validate(r) for r in items]

    def remove_push_token(self, subscriber_id: str, token: str) -> list[PushTokenResponse]:
        raw = self._request("DELETE", f"/subscribers/{quote(subscriber_id)}/push-tokens/{quote(token)}")
        items = raw if isinstance(raw, list) else []
        return [PushTokenResponse.model_validate(r) for r in items]


class AsyncSubscribersResource:
    def __init__(self, request: Callable[..., Awaitable[Any]]) -> None:
        self._request = request

    async def create(self, **kwargs: Any) -> SubscriberResponse:
        params = CreateSubscriberRequest(**kwargs)
        body = params.model_dump(by_alias=True, exclude_none=True)
        raw = await self._request("POST", "/subscribers", json=body)
        return SubscriberResponse.model_validate(raw)

    async def list(self, limit: int = 20, offset: int = 0) -> list[SubscriberResponse]:
        raw = await self._request("GET", f"/subscribers?limit={limit}&offset={offset}")
        items = raw if isinstance(raw, list) else []
        return [SubscriberResponse.model_validate(r) for r in items]

    async def get(self, subscriber_id: str) -> SubscriberResponse:
        raw = await self._request("GET", f"/subscribers/{quote(subscriber_id)}")
        return SubscriberResponse.model_validate(raw)

    async def update(self, subscriber_id: str, **kwargs: Any) -> SubscriberResponse:
        params = UpdateSubscriberRequest(**kwargs)
        body = params.model_dump(by_alias=True, exclude_none=True)
        raw = await self._request("PATCH", f"/subscribers/{quote(subscriber_id)}", json=body)
        return SubscriberResponse.model_validate(raw)

    async def delete(self, subscriber_id: str) -> None:
        await self._request("DELETE", f"/subscribers/{quote(subscriber_id)}")

    async def get_preferences(self, subscriber_id: str) -> PreferencesResponse:
        raw = await self._request("GET", f"/subscribers/{quote(subscriber_id)}/preferences")
        return PreferencesResponse.model_validate(raw)

    async def update_preferences(self, subscriber_id: str, preferences: dict) -> PreferencesResponse:
        raw = await self._request("PATCH", f"/subscribers/{quote(subscriber_id)}/preferences", json=preferences)
        return PreferencesResponse.model_validate(raw)

    async def register_push_token(self, subscriber_id: str, **kwargs: Any) -> list[PushTokenResponse]:
        params = RegisterPushTokenRequest(**kwargs)
        body = params.model_dump(by_alias=True, exclude_none=True)
        raw = await self._request("POST", f"/subscribers/{quote(subscriber_id)}/push-tokens", json=body)
        items = raw if isinstance(raw, list) else []
        return [PushTokenResponse.model_validate(r) for r in items]

    async def list_push_tokens(self, subscriber_id: str) -> list[PushTokenResponse]:
        raw = await self._request("GET", f"/subscribers/{quote(subscriber_id)}/push-tokens")
        items = raw if isinstance(raw, list) else []
        return [PushTokenResponse.model_validate(r) for r in items]

    async def remove_push_token(self, subscriber_id: str, token: str) -> list[PushTokenResponse]:
        raw = await self._request("DELETE", f"/subscribers/{quote(subscriber_id)}/push-tokens/{quote(token)}")
        items = raw if isinstance(raw, list) else []
        return [PushTokenResponse.model_validate(r) for r in items]
