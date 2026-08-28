"""
POST /v1/chargebacks/respond   — Generate chargeback evidence package
GET  /v1/chargebacks/{id}/status — Check dispute status
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import authenticated, get_redis
from app.db.session import get_db
from app.db.models import Transaction, RiskDecision, Merchant
from app.models.transaction import (
    ChargebackEvidenceRequest,
    ChargebackEvidenceResponse,
    ChargebackStatusResponse,
)
from app.services.llm_reasoner import get_llm_reasoner
from app.core.logging import get_logger
from datetime import datetime, timezone, timedelta

router = APIRouter()
logger = get_logger(__name__)


@router.post(
    "/respond",
    response_model=ChargebackEvidenceResponse,
    summary="Generate chargeback dispute evidence",
    description=(
        "Given a chargeback reason code and deadline, "
        "generates a structured evidence package using AI."
    ),
    status_code=status.HTTP_200_OK,
)
async def respond_to_chargeback(
    body: ChargebackEvidenceRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current: dict = Depends(authenticated),
) -> ChargebackEvidenceResponse:
    response.headers["X-Request-ID"] = str(uuid.uuid4())
    merchant_id = current["merchant_id"]

    # ── 1. Fetch original transaction ─────────────────────────────────────────
    result = await db.execute(
        select(Transaction).where(
            Transaction.merchant_id == uuid.UUID(merchant_id),
        )
    )
    # Match by external transaction_id in metadata or customer_id
    # In production: add an external_transaction_id indexed column
    txn = await _find_transaction(db, body.transaction_id, merchant_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {body.transaction_id} not found",
        )

    # ── 2. Fetch customer history ─────────────────────────────────────────────
    history = await _fetch_customer_history(db, txn.customer_id, merchant_id)

    # ── 3. Build transaction dict for LLM ────────────────────────────────────
    txn_dict = {
        "transaction_id": body.transaction_id,
        "amount": str(body.amount),
        "currency": txn.currency,
        "payment_method": txn.payment_method,
        "customer_id": txn.customer_id,
        "device_id": txn.device_id,
        "ip_address": txn.ip_address,
        "is_international": txn.is_international,
        "created_at": txn.created_at.isoformat(),
        "chargeback_reason_code": body.chargeback_reason_code,
        "dispute_deadline": body.dispute_deadline.isoformat(),
    }

    # ── 4. Generate evidence via LLM ──────────────────────────────────────────
    reasoner = get_llm_reasoner(redis=redis)
    evidence = await reasoner.generate_chargeback_evidence(txn_dict, history)

    logger.info(
        "chargeback_evidence_generated",
        transaction_id=body.transaction_id,
        merchant_id=merchant_id,
        confidence=evidence.confidence,
    )
    return evidence


@router.get(
    "/{transaction_id}/status",
    response_model=ChargebackStatusResponse,
    summary="Get chargeback dispute status",
    description="Returns current risk decision and LLM evidence summary for a transaction.",
    status_code=status.HTTP_200_OK,
)
async def get_chargeback_status(
    transaction_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current: dict = Depends(authenticated),
) -> ChargebackStatusResponse:
    response.headers["X-Request-ID"] = str(uuid.uuid4())
    merchant_id = current["merchant_id"]

    txn = await _find_transaction(db, transaction_id, merchant_id)
    if not txn:
        return ChargebackStatusResponse(
            transaction_id=transaction_id,
            decision=None,
            chargeback_risk_score=None,
            llm_reason=None,
            status="not_found",
        )

    # Fetch associated risk decision
    rd_result = await db.execute(
        select(RiskDecision).where(RiskDecision.transaction_id == txn.id)
    )
    rd = rd_result.scalar_one_or_none()

    if not rd:
        return ChargebackStatusResponse(
            transaction_id=transaction_id,
            decision=None,
            chargeback_risk_score=None,
            llm_reason=None,
            status="pending",
        )

    return ChargebackStatusResponse(
        transaction_id=transaction_id,
        decision=rd.decision.value,
        chargeback_risk_score=float(rd.chargeback_risk_score),
        llm_reason=rd.llm_reason,
        status="evidence_ready" if rd.llm_reason else "pending",
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _find_transaction(
    db: AsyncSession,
    transaction_id: str,
    merchant_id: str,
) -> Transaction | None:
    """
    Look up a transaction by external transaction_id stored in metadata.
    Falls back to matching customer_id for demo purposes.
    """
    result = await db.execute(
        select(Transaction).where(
            Transaction.merchant_id == uuid.UUID(merchant_id),
            Transaction.metadata_["transaction_id"].astext == transaction_id,
        )
    )
    return result.scalar_one_or_none()


async def _fetch_customer_history(
    db: AsyncSession,
    customer_id: str,
    merchant_id: str,
) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.customer_id == customer_id,
            Transaction.merchant_id == uuid.UUID(merchant_id),
            Transaction.created_at >= cutoff,
        )
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    rows = result.scalars().all()
    return [
        {
            "amount": float(row.amount),
            "currency": row.currency,
            "payment_method": row.payment_method,
            "created_at": row.created_at.isoformat(),
            "had_chargeback": False,  # extend when chargeback table tracks outcomes
        }
        for row in rows
    ]