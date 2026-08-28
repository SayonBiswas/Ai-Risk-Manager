"""
Async webhook dispatcher.
Sends HMAC-SHA256 signed event payloads to merchant webhook URLs.
Retries 3 times with exponential backoff.
Logs delivery outcomes to webhook_delivery_logs table.
Runs in background — never blocks the API response.

Signature verification (merchant side):
    import hmac, hashlib
    expected = hmac.new(
        webhook_secret.encode(),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    assert hmac.compare_digest(expected, request.headers["X-Webhook-Signature"])
"""

import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal

settings = get_settings()
logger = get_logger(__name__)


# ── ORM model (added to models.py below) ─────────────────────────────────────

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class WebhookDispatcher:
    """
    Dispatches signed webhook events to a merchant's registered URL.

    Usage:
        dispatcher = WebhookDispatcher(merchant)
        asyncio.create_task(dispatcher.dispatch("risk.blocked", payload_dict))
    """

    def __init__(self, merchant):
        """
        Args:
            merchant: Merchant ORM instance — needs webhook_url, webhook_secret, id.
        """
        self._merchant = merchant

    async def dispatch(self, event: str, payload: dict) -> None:
        """
        Build signed payload and POST to merchant webhook URL.
        Retries up to 3 times on failure.
        Logs success/failure to webhook_delivery_logs.
        Non-blocking — call via asyncio.create_task().

        Events:
            risk.blocked          — transaction was blocked
            risk.flagged          — transaction flagged for review
            chargeback.evidence_ready — evidence package compiled
        """
        if not self._merchant.webhook_url:
            logger.debug(
                "webhook_skipped_no_url",
                merchant_id=str(self._merchant.id),
                event=event,
            )
            return

        full_payload = {
            "event": event,
            "merchant_id": str(self._merchant.id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **payload,
        }

        body_bytes = json.dumps(full_payload, default=str).encode("utf-8")
        signature = _sign_payload(body_bytes, self._merchant.webhook_secret or "")

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
            "X-Merchant-ID": str(self._merchant.id),
        }

        success, status_code, error_detail = await _post_with_retry(
            url=self._merchant.webhook_url,
            body_bytes=body_bytes,
            headers=headers,
        )

        await _log_delivery(
            merchant_id=str(self._merchant.id),
            event=event,
            url=self._merchant.webhook_url,
            payload=full_payload,
            success=success,
            status_code=status_code,
            error_detail=error_detail,
        )


# ── Signing ───────────────────────────────────────────────────────────────────

def _sign_payload(body_bytes: bytes, secret: str) -> str:
    """
    HMAC-SHA256 signature over the raw JSON payload bytes.
    Merchant verifies by computing the same HMAC and comparing
    with hmac.compare_digest() — never ==.
    """
    return hmac.new(
        secret.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()


# ── HTTP delivery with retry ──────────────────────────────────────────────────

class _WebhookDeliveryError(Exception):
    """Raised for retryable HTTP errors."""
    def __init__(self, status_code: int):
        self.status_code = status_code


@retry(
    retry=retry_if_exception_type(_WebhookDeliveryError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=8),  # 2s, 4s, 8s
    reraise=False,
)
async def _post_with_retry(
    url: str,
    body_bytes: bytes,
    headers: dict,
) -> tuple[bool, int | None, str | None]:
    """
    POST the webhook payload to the merchant URL.
    Returns (success, status_code, error_detail).
    Retries on network errors and 429/5xx status codes.
    """
    try:
        async with httpx.AsyncClient(
            timeout=settings.webhook_timeout_seconds
        ) as client:
            resp = await client.post(
                url,
                content=body_bytes,
                headers=headers,
            )

            if resp.status_code in RETRYABLE_STATUS_CODES:
                logger.warning(
                    "webhook_retryable_error",
                    url=url,
                    status_code=resp.status_code,
                )
                raise _WebhookDeliveryError(resp.status_code)

            if resp.status_code >= 400:
                # Non-retryable client error (400, 401, 403, 404 etc.)
                logger.warning(
                    "webhook_client_error",
                    url=url,
                    status_code=resp.status_code,
                )
                return False, resp.status_code, f"Client error: {resp.status_code}"

            logger.info(
                "webhook_delivered",
                url=url,
                status_code=resp.status_code,
            )
            return True, resp.status_code, None

    except _WebhookDeliveryError:
        raise  # let tenacity handle retry

    except httpx.TimeoutException:
        logger.warning("webhook_timeout", url=url)
        raise _WebhookDeliveryError(0)  # treat timeout as retryable

    except httpx.RequestError as exc:
        logger.warning("webhook_request_error", url=url, error=str(exc))
        raise _WebhookDeliveryError(0)


# ── Delivery log ──────────────────────────────────────────────────────────────

async def _log_delivery(
    merchant_id: str,
    event: str,
    url: str,
    payload: dict,
    success: bool,
    status_code: int | None,
    error_detail: str | None,
) -> None:
    """Write webhook delivery outcome to webhook_delivery_logs table."""
    try:
        from app.db.models import WebhookDeliveryLog  # noqa: PLC0415
        async with AsyncSessionLocal() as session:
            log = WebhookDeliveryLog(
                merchant_id=uuid.UUID(merchant_id),
                event=event,
                url=url,
                payload=payload,
                success=success,
                status_code=status_code,
                error_detail=error_detail,
            )
            session.add(log)
            await session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("webhook_log_write_failed", error=str(exc))