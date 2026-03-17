from abc import ABC, abstractmethod


class BillingProvider(ABC):
    @abstractmethod
    async def create_subscription(self, team_id: str, plan: dict, customer_email: str) -> dict:
        """Returns {subscription_id, checkout_url, provider_data}"""

    @abstractmethod
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel at period end. Returns success."""

    @abstractmethod
    def verify_webhook(self, headers: dict, body: bytes) -> dict | None:
        """HMAC-SHA256 verify (CPU-bound, stays sync). Returns parsed event or None."""

    @abstractmethod
    async def get_subscription_status(self, subscription_id: str) -> dict:
        """Returns {status, current_period_end, plan_id}"""
