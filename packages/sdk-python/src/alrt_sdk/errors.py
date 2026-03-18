"""Error types for the alrt SDK."""


class AlrtError(Exception):
    """Base error for all alrt SDK errors."""

    def __init__(self, message: str, status: int, code: str) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


class AlrtAuthError(AlrtError):
    def __init__(self, message: str = "Invalid or missing API key") -> None:
        super().__init__(message, 401, "auth_error")


class AlrtValidationError(AlrtError):
    def __init__(self, message: str = "Invalid request", status: int = 400) -> None:
        super().__init__(message, status, "validation_error")


class AlrtNotFoundError(AlrtError):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, 404, "not_found")


class AlrtConflictError(AlrtError):
    def __init__(self, message: str = "Resource already exists") -> None:
        super().__init__(message, 409, "conflict")


class AlrtRateLimitError(AlrtError):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None) -> None:
        super().__init__(message, 429, "rate_limit")
        self.retry_after = retry_after


class AlrtApiError(AlrtError):
    def __init__(self, message: str = "Internal server error", status: int = 500) -> None:
        super().__init__(message, status, "api_error")


def _extract_detail(body: str) -> str:
    try:
        import json
        parsed = json.loads(body)
        return parsed.get("detail", parsed.get("message", body))
    except (json.JSONDecodeError, AttributeError):
        return body


def raise_for_status(status: int, body: str, retry_after: int | None = None) -> None:
    detail = _extract_detail(body)
    if status == 401:
        raise AlrtAuthError(detail)
    if status == 404:
        raise AlrtNotFoundError(detail)
    if status == 409:
        raise AlrtConflictError(detail)
    if status == 429:
        raise AlrtRateLimitError(detail, retry_after)
    if status in (400, 422):
        raise AlrtValidationError(detail, status)
    raise AlrtApiError(detail, status)
