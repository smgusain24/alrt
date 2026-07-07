"""Request-id correlation middleware.

Assigns every request a correlation id (from the ``X-Request-Id`` header if the client
sent one, else a fresh UUID), exposes it via a contextvar, and echoes it on the
response. The trigger routes stamp it onto the workflow_executions row so a request can
be traced end to end: API request -> execution -> worker log lines.

Implemented as a pure ASGI middleware (not BaseHTTPMiddleware) so the contextvar set
here reliably propagates into the route handler.
"""

import uuid
from contextvars import ContextVar

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)

REQUEST_ID_HEADER = "x-request-id"


def get_request_id() -> str | None:
    """Return the current request's correlation id, or None outside a request."""
    return _request_id.get()


class RequestIdMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        raw = headers.get(REQUEST_ID_HEADER.encode())
        request_id = raw.decode() if raw else str(uuid.uuid4())
        token = _request_id.set(request_id)

        async def send_with_header(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + [
                    (REQUEST_ID_HEADER.encode(), request_id.encode())
                ]
            await send(message)

        try:
            await self.app(scope, receive, send_with_header)
        finally:
            _request_id.reset(token)
