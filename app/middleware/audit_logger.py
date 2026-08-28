"""
Starlette middleware that writes every request to the audit_logs table.
Runs asynchronously and never blocks the response.
"""

import asyncio
import hashlib
import json
import time
from uuid import UUID

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal

logger = get_logger(__name__)


class AuditLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()

        # Read body once and re-inject (Starlette streams body only once)
        body = await request.body()
        payload_hash = hashlib.sha256(body).hexdigest()

        async def receive():
            return {"type": "http.request", "body": body}

        request._receive = receive  # noqa: SLF001

        response = await call_next(request)
        duration_ms = int((time.monotonic() - start) * 1000)

        merchant_id = getattr(getattr(request, "state", None), "merchant_id", None)

        # Fire-and-forget — don't let DB errors affect the response
        asyncio.create_task(
            _write_audit_log(
                merchant_id=merchant_id,
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                payload_hash=payload_hash,
            )
        )

        return response


async def _write_audit_log(
    merchant_id: str | None,
    method: str,
    endpoint: str,
    status_code: int,
    duration_ms: int,
    payload_hash: str,
) -> None:
    """Write audit entry — runs in background task."""
    try:
        # Import here to avoid circular imports before models are registered
        from app.db.models import AuditLog  # noqa: PLC0415

        async with AsyncSessionLocal() as session:
            log_entry = AuditLog(
                merchant_id=UUID(merchant_id) if merchant_id else None,
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                duration_ms=duration_ms,
                payload_hash=payload_hash,
            )
            session.add(log_entry)
            await session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("audit_log_write_failed", error=str(exc))