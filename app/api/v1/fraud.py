"""
POST /v1/fraud/detect
Fraud risk scoring endpoint.
"""

import time
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import authenticated, get_redis
from app.db.session import get_db
from app.db.models import Transaction, RiskDecision, Merchant, DecisionEnum
from app.models.transaction import TransactionRequest, RiskScoreResponse
from app.models.risk_score import RiskScores, RiskDecisionResult
from app.services.feature_extractor import FeatureExtractor
from app.services.fraud_detector import fraud_detector, return_risk, chargeback_risk
from app.services.llm_reasoner import get_llm_reasoner
from app.services.webhook_dispatcher import WebhookDispatcher
from app.core.config import get_settings
from app.core.logging import get_logger

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)
extractor = FeatureExtractor()


@router.post(
    "/detect",
    response_model=RiskScoreResponse,
    summary="Detect fraud risk for a transaction",
    description=(
        "Scores a transaction for fraud, return risk, and chargeback risk. "
        "Returns a decision (ALLOW / FLAG / BLOCK) with an LLM-generated explanation."
    ),
    status_code=status.HTTP_200_OK,
)
async def detect_fraud(
    body: TransactionRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    current: dict = Depends(authenticated),
) -> RiskScoreResponse:
    start_ms = time.monotonic()
    request_id = str(uuid.uuid4())
    response.headers["X-Request-ID"] = request_id

    merchant_id = current["merchant_id"]

    # ── 1. Fetch last 24h transaction history from DB ─────────────────────────
    history = await _fetch_history(db, body.customer_id, merchant_id)

    # ── 2. Extract features ───────────────────────────────────────────────────
    features = extractor.extract(body, history)

    # ── 3. Score ──────────────────────────────────────────────────────────────
    fraud_score, return_score, cb_score = await _score(features)

    # ── 4. Apply decision rules ───────────────────────────────────────────────
    scores = RiskScores(
        fraud_score=fraud_score,
        return_risk_score=return_score,
        chargeback_risk_score=cb_score,
    )
    result = RiskDecisionResult.from_scores(scores)

    # ── 5. LLM reason (only for FLAG / BLOCK) ─────────────────────────────────
    reason = ""
    if result.decision in ("FLAG", "BLOCK"):
        reasoner = get_llm_reasoner(redis=redis)
        reason = await reasoner.generate_reason(
            transaction=body,
            features=features,
            fraud_score=fraud_score,
            return_score=return_score,
            cb_score=cb_score,
            decision=result.decision,
        )
    else:
        reason = "Transaction approved — all risk signals within acceptable thresholds."

    # ── 6. Persist transaction + risk decision ────────────────────────────────
    await _persist(db, body, merchant_id, scores, result, features, reason)

    # ── 7. Dispatch webhook in background ─────────────────────────────────────
    if result.decision in ("FLAG", "BLOCK"):
        merchant = await db.get(Merchant, uuid.UUID(merchant_id))
        if merchant and merchant.webhook_url:
            dispatcher = WebhookDispatcher(merchant)
            event_name = (
                "risk.blocked" if result.decision == "BLOCK" else "risk.flagged"
            )
            import asyncio
            asyncio.create_task(
                dispatcher.dispatch(
                    event=event_name,
                    payload={
                        "transaction_id": body.transaction_id,
                        "decision": result.decision,
                        "fraud_score": fraud_score,
                        "return_risk_score": return_score,
                        "chargeback_risk_score": cb_score,
                    },
                )
            )

    latency_ms = int((time.monotonic() - start_ms) * 1000)
    logger.info(
        "fraud_detect",
        transaction_id=body.transaction_id,
        decision=result.decision,
        fraud_score=fraud_score,
        latency_ms=latency_ms,
        request_id=request_id,
    )

    return RiskScoreResponse(
        transaction_id=body.transaction_id,
        decision=result.decision,
        fraud_score=fraud_score,
        return_risk_score=return_score,
        chargeback_risk_score=cb_score,
        reason=reason,
        recommended_actions=result.recommended_actions,
        model_version=settings.model_version,
        latency_ms=latency_ms,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_history(
    db: AsyncSession,
    customer_id: str,
    merchant_id: str,
) -> list[dict]:
    """Fetch last 24h transactions for this customer + merchant."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.customer_id == customer_id,
            Transaction.merchant_id == uuid.UUID(merchant_id),
            Transaction.created_at >= cutoff,
        )
        .order_by(Transaction.created_at.desc())
        .limit(100)
    )
    rows = result.scalars().all()
    return [
        {
            "amount": row.amount,
            "created_at": row.created_at,
            "device_id": row.device_id,
        }
        for row in rows
    ]


async def _score(features: dict) -> tuple[float, float, float]:
    """Run all three ML models concurrently."""
    import asyncio
    fraud_score, return_score, cb_score = await asyncio.gather(
        fraud_detector.predict(features),
        return_risk.predict(features),
        chargeback_risk.predict(features),
    )
    return fraud_score, return_score, cb_score


async def _persist(
    db: AsyncSession,
    body: TransactionRequest,
    merchant_id: str,
    scores: RiskScores,
    result: RiskDecisionResult,
    features: dict,
    reason: str,
) -> None:
    """Save Transaction + RiskDecision to DB."""
    txn = Transaction(
        merchant_id=uuid.UUID(merchant_id),
        amount=body.amount,
        currency=body.currency,
        customer_id=body.customer_id,
        payment_method=body.payment_method,
        device_id=body.device_id,
        ip_address=body.ip_address,
        merchant_category_code=body.merchant_category_code,
        is_international=body.is_international,
        metadata_={**body.metadata, "transaction_id": body.transaction_id},
    )
    db.add(txn)
    await db.flush()  # get txn.id without committing

    decision_row = RiskDecision(
        transaction_id=txn.id,
        decision=DecisionEnum[result.decision],
        fraud_score=scores.fraud_score,
        return_risk_score=scores.return_risk_score,
        chargeback_risk_score=scores.chargeback_risk_score,
        model_version=settings.model_version,
        feature_snapshot=features,
        llm_reason=reason,
    )
    db.add(decision_row)
    # session.commit() is handled by get_db() dependency