"""Adds standard security response headers to every response."""

from starlette.middleware.base import BaseHTTPMiddleware

# Applied to all responses. HSTS is harmless over plain HTTP (browsers ignore it),
# so it's safe to send unconditionally.
_BASE_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}

# This is a JSON API — nothing should embed it or load resources from it.
_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

# Swagger/Redoc render HTML that pulls JS/CSS from a CDN; a strict CSP breaks them.
_CSP_EXEMPT = ("/docs", "/redoc", "/openapi.json")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        for key, value in _BASE_HEADERS.items():
            response.headers.setdefault(key, value)
        if not request.url.path.startswith(_CSP_EXEMPT):
            response.headers.setdefault("Content-Security-Policy", _CSP)
        return response
