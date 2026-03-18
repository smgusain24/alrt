"""Tests for error hierarchy."""
import pytest
from alrt_sdk.errors import (
    AlrtError, AlrtAuthError, AlrtNotFoundError,
    AlrtConflictError, AlrtRateLimitError, AlrtApiError,
    raise_for_status,
)


def test_auth_error():
    err = AlrtAuthError("bad key")
    assert err.status == 401
    assert err.code == "auth_error"
    assert isinstance(err, AlrtError)


def test_rate_limit_error_with_retry_after():
    err = AlrtRateLimitError("slow down", retry_after=30)
    assert err.retry_after == 30


def test_conflict_error():
    err = AlrtConflictError()
    assert err.status == 409


def test_raise_for_status_401():
    with pytest.raises(AlrtAuthError):
        raise_for_status(401, '{"detail": "Invalid API key"}')


def test_raise_for_status_404():
    with pytest.raises(AlrtNotFoundError):
        raise_for_status(404, '{"detail": "Not found"}')


def test_raise_for_status_409():
    with pytest.raises(AlrtConflictError):
        raise_for_status(409, '{"detail": "Already exists"}')


def test_raise_for_status_500():
    with pytest.raises(AlrtApiError):
        raise_for_status(500, "Internal error")
