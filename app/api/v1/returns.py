"""
POST /v1/returns/score
Return risk scoring endpoint.
"""

import time
import uuid

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import authenticated, get_redis
from app.db.session import get_db
from app.models.transaction import TransactionRequest, ReturnRiskResponse
from app.services.feature_extractor import FeatureExtractor
from app.services.fraud_detector import return_risk
from app.core.config import get_settings
from app.core.logging import get_logger

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)
extractor = FeatureExtractor()


def _risk_band(score: float) -> str:
    if score >= 0.7:
        return "HIGH"
    if score >= 0.4:
        return "MEDIUM"
    return "LOW"


def _recommended_actions(score: float, band: str) -> list[str]:
    if band == "HIGH":
        return [
            "Require proof of delivery before dispatch",
            "Consider prepaid-only policy for this customer",
            "Flag order for manual fulfilment review",
        ]
    if band == "MEDIUM":
        return [
            "Apply standard return window policy",
            "Confirm delivery address via customer callback",
        ]
    return ["No additional action required — low return risk"]


@router.post(
    "/score",
    response_model=ReturnRiskResponse,
    summary="Score return risk for a transaction",
    description=(
        "Predicts the likelihood that this transaction will result in a return. "
        "Returns a risk score, band (LOW/MEDIUM/HIGH), and recommended actions."
    ),
    status_code=status.HTTP_200_OK,
)
async def score_return_risk(
    body: TransactionRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current: dict = Depends(authenticated),
) -> ReturnRiskResponse:
    start_ms = time.monotonic()
    request_id = str(uuid.uuid4())
    response.headers["X-Request-ID"] = request_id

    # Feature extraction — no history needed for return scoring (simpler signal)
    features = extractor.extract(body, history=[])

    score = await return_risk.predict(features)
    band = _risk_band(score)
    actions = _recommended_actions(score, band)

    latency_ms = int((time.monotonic() - start_ms) * 1000)

    logger.info(
        "return_score",
        transaction_id=body.transaction_id,
        score=score,
        band=band,
        latency_ms=latency_ms,
        request_id=request_id,
    )

    return ReturnRiskResponse(
        transaction_id=body.transaction_id,
        return_risk_score=score,
        risk_band=band,
        recommended_actions=actions,
        model_version=settings.model_version,
        latency_ms=latency_ms,
    )