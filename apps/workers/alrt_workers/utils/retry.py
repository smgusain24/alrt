from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class RetryPolicy:
    """Per-channel retry configuration. Fields map to Celery task kwargs."""

    max_retries: int
    default_retry_delay: int  
    retry_backoff: bool = False
    retry_backoff_max: int = 3600  
    retry_jitter: bool = True

    def as_task_kwargs(self) -> dict:
        """Return dict to unpack into @celery_app.task(...)."""
        d = asdict(self)
        if not self.retry_backoff:
            d.pop("retry_backoff_max")
        return d



INAPP_RETRY = RetryPolicy(
    max_retries=3,
    default_retry_delay=5,
    retry_backoff=False,
    retry_jitter=False,
)

EMAIL_RETRY = RetryPolicy(
    max_retries=5,
    default_retry_delay=30,
    retry_backoff=True,
    retry_backoff_max=3600,
    retry_jitter=True,
)

SLACK_RETRY = RetryPolicy(
    max_retries=5,
    default_retry_delay=10,
    retry_backoff=True,
    retry_backoff_max=1800,
    retry_jitter=True,
)
