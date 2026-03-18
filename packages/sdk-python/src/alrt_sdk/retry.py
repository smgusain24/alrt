"""Retry logic with exponential backoff."""
import random
import time
import asyncio

BASE_DELAY = 0.5  # 500ms
JITTER_MAX = 0.1  # 100ms


def is_retryable(status: int) -> bool:
    return status == 429 or status >= 500


def get_retry_delay(attempt: int, retry_after: str | None) -> float:
    if retry_after:
        try:
            return float(retry_after)
        except ValueError:
            pass
    exponential = BASE_DELAY * (2 ** attempt)
    jitter = random.random() * JITTER_MAX
    return exponential + jitter


def sync_sleep(seconds: float) -> None:
    time.sleep(seconds)


async def async_sleep(seconds: float) -> None:
    await asyncio.sleep(seconds)
