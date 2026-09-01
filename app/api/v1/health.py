"""
GET /health — liveness probe.
No auth required — used by load balancers, Render health checks, and uptime monitors.
"""

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get(
    "/health",
    tags=["Health"],
    summary="Liveness probe",
    description="Returns service status and version. No authentication required.",
)
async def health_check() -> dict:
    """Return 200 OK with app version — used by Render / Docker health checks."""
    return {"status": "ok", "version": settings.app_version}


@router.post(
    "/test-fraud",
    tags=["Health"],
    summary="Test fraud detection (no auth)",
    description="Test endpoint for fraud detection without authentication. For development only.",
)
async def test_fraud_detection(transaction: dict) -> dict:
    """Test endpoint that mimics fraud detection without authentication."""
    # Validate required fields
    required_fields = ["transaction_id", "amount", "currency", "customer_id", "payment_method", "ip_address", "merchant_category_code"]
    for field in required_fields:
        if field not in transaction:
            return {
                "error": f"Missing required field: {field}",
                "transaction_id": transaction.get("transaction_id", "unknown"),
                "decision": "ERROR",
                "fraud_score": 0.0,
                "return_risk_score": 0.0,
                "chargeback_risk_score": 0.0,
                "reason": f"Invalid request: missing {field}",
                "recommended_actions": ["Fix request format"],
                "model_version": "test-mode",
                "latency_ms": 0
            }

    return {
        "transaction_id": transaction.get("transaction_id", "unknown"),
        "decision": "ALLOW",
        "fraud_score": 0.1,
        "return_risk_score": 0.2,
        "chargeback_risk_score": 0.15,
        "reason": "Test transaction - all risk signals within acceptable thresholds.",
        "recommended_actions": ["Monitor transaction", "Process normally"],
        "model_version": "test-mode",
        "latency_ms": 50
    }