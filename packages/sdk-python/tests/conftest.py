"""Shared test fixtures for alrt SDK tests."""
import httpx
import pytest
from unittest.mock import MagicMock


def mock_response(status_code: int = 200, json_data: dict | list | None = None, text: str = "", headers: dict | None = None):
    """Create a mock httpx.Response."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.is_success = 200 <= status_code < 300
    resp.json.return_value = json_data
    resp.text = text or (str(json_data) if json_data else "")
    resp.headers = headers or {}
    return resp
