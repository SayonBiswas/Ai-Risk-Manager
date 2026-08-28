"""
AI Risk Manager — FastAPI application entry point.

Start locally:
    uvicorn app.main:app --reload --port 8000

Render start command:
    uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from app.api.v1.health import router as health_router
from app.api.v1.fraud import router as fraud_router
from app.api.v1.chargebacks import router as chargebacks_router
from app.api.v1.returns import router as returns_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.middleware.audit_logger import AuditLoggerMiddleware
from app.services.fraud_detector import load_all_models

settings = get_settings()
configure_logging(debug=settings.debug)
logger = get_logger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-powered fraud detection, return-risk scoring, "
        "and chargeback response for payment merchants."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# ALLOWED_ORIGINS env var controls which frontends can call this API.
# Add your Vercel / Netlify URL there — no code change needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Audit logger middleware ───────────────────────────────────────────────────
app.add_middleware(AuditLoggerMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(fraud_router,       prefix="/v1/fraud",       tags=["Fraud"])
app.include_router(chargebacks_router, prefix="/v1/chargebacks", tags=["Chargebacks"])
app.include_router(returns_router,     prefix="/v1/returns",     tags=["Returns"])

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup() -> None:
    # Connect Redis
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)

    # Load ML models into memory
    load_all_models()

    logger.info(
        "startup",
        app=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        port=os.getenv("PORT", settings.port),
    )


@app.on_event("shutdown")
async def shutdown() -> None:
    await app.state.redis.aclose()
    logger.info("shutdown", app=settings.app_name)