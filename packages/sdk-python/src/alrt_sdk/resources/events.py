"""Events resource — trigger and trigger_bulk."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable, Awaitable

from alrt_sdk.types import (
    TriggerEventRequest,
    TriggerEventResponse,
    TriggerBulkRequest,
    TriggerBulkResponse,
)

if TYPE_CHECKING:
    pass


class EventsResource:
    def __init__(self, request: Callable[..., Any]) -> None:
        self._request = request

    def trigger(self, **kwargs: Any) -> TriggerEventResponse:
        params = TriggerEventRequest(**kwargs)
        idempotency_key = params.idempotency_key
        body = params.model_dump(by_alias=True, exclude_none=True, exclude={"idempotency_key"})
        raw = self._request(
            "POST", "/events/trigger", json=body,
            idempotency_key=idempotency_key,
        )
        return TriggerEventResponse.model_validate(raw)

    def trigger_bulk(self, **kwargs: Any) -> TriggerBulkResponse:
        params = TriggerBulkRequest(**kwargs)
        idempotency_key = params.idempotency_key
        body = params.model_dump(by_alias=True, exclude_none=True, exclude={"idempotency_key"})
        raw = self._request(
            "POST", "/events/trigger-bulk", json=body,
            idempotency_key=idempotency_key,
        )
        return TriggerBulkResponse.model_validate(raw)


class AsyncEventsResource:
    def __init__(self, request: Callable[..., Awaitable[Any]]) -> None:
        self._request = request

    async def trigger(self, **kwargs: Any) -> TriggerEventResponse:
        params = TriggerEventRequest(**kwargs)
        idempotency_key = params.idempotency_key
        body = params.model_dump(by_alias=True, exclude_none=True, exclude={"idempotency_key"})
        raw = await self._request(
            "POST", "/events/trigger", json=body,
            idempotency_key=idempotency_key,
        )
        return TriggerEventResponse.model_validate(raw)

    async def trigger_bulk(self, **kwargs: Any) -> TriggerBulkResponse:
        params = TriggerBulkRequest(**kwargs)
        idempotency_key = params.idempotency_key
        body = params.model_dump(by_alias=True, exclude_none=True, exclude={"idempotency_key"})
        raw = await self._request(
            "POST", "/events/trigger-bulk", json=body,
            idempotency_key=idempotency_key,
        )
        return TriggerBulkResponse.model_validate(raw)
