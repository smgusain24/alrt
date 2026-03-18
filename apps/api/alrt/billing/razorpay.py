import asyncio
import hashlib
import hmac
import json
import logging

import razorpay

from alrt.billing.provider import BillingProvider

logger = logging.getLogger("alrt.billing.razorpay")


class RazorpayProvider(BillingProvider):
    def __init__(self, key_id: str, key_secret: str, webhook_secret: str):
        self._client = razorpay.Client(auth=(key_id, key_secret))
        self._webhook_secret = webhook_secret

    async def create_subscription(self, team_id: str, plan: dict, customer_email: str) -> dict:
        def _create():
            sub = self._client.subscription.create({
                "plan_id": plan.get("razorpay_plan_id", ""),
                "total_count": 12,
                "quantity": 1,
                "notes": {"team_id": team_id, "email": customer_email},
            })
            return sub

        sub = await asyncio.to_thread(_create)
        return {
            "subscription_id": sub["id"],
            "checkout_url": sub.get("short_url", ""),
            "provider_data": {"razorpay_subscription_id": sub["id"]},
        }

    async def cancel_subscription(self, subscription_id: str) -> bool:
        def _cancel():
            self._client.subscription.cancel(subscription_id, {"cancel_at_cycle_end": 1})

        await asyncio.to_thread(_cancel)
        return True

    def verify_webhook(self, headers: dict, body: bytes) -> dict | None:
        signature = headers.get("x-razorpay-signature", "")
        expected = hmac.new(
            self._webhook_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            logger.warning("Webhook signature verification failed")
            return None

        payload = json.loads(body)
        event = payload.get("event", "")
        entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})

        return {
            "event_type": event,
            "event_id": payload.get("event_id", entity.get("id", "")),
            "subscription_id": entity.get("id", ""),
            "status": entity.get("status", ""),
            "plan_id": entity.get("plan_id", ""),
            "current_period_end": entity.get("current_end"),
            "notes": entity.get("notes", {}),
        }

    async def get_subscription_status(self, subscription_id: str) -> dict:
        def _fetch():
            return self._client.subscription.fetch(subscription_id)

        sub = await asyncio.to_thread(_fetch)
        return {
            "status": sub.get("status", ""),
            "current_period_end": sub.get("current_end"),
            "plan_id": sub.get("plan_id", ""),
        }
