"""
AI Risk Manager — FastAPI application entry point.

Start locally:
    uvicorn app.main:app --reload --port 8000

Render start command:
    uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""

import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from app.api.v1.health import router as health_router
from app.api.v1.fraud import router as fraud_router
from app.api.v1.chargebacks import router as chargebacks_router
from app.api.v1.returns import router as returns_router
from app.api.v1.auth import router as auth_router
from app.api.v1.api_keys import router as api_keys_router
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

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Audit logger middleware ───────────────────────────────────────────────────
# Temporarily disabled due to response handling issues
# app.add_middleware(AuditLoggerMiddleware)

# ── Validation error handler — logs exact failing field to terminal ───────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    body = await request.body()
    logger.error(
        "validation_error",
        errors=errors,
        raw_body=body.decode("utf-8", errors="replace"),
        path=str(request.url),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(fraud_router,       prefix="/v1/fraud",       tags=["Fraud"])
app.include_router(chargebacks_router, prefix="/v1/chargebacks", tags=["Chargebacks"])
app.include_router(returns_router,     prefix="/v1/returns",     tags=["Returns"])
app.include_router(auth_router,        prefix="/auth",           tags=["Auth"])
app.include_router(api_keys_router,    prefix="/api-keys",       tags=["API Keys"])

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup() -> None:
    # Connect Redis — optional, app works without it (no caching)
    try:
        app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await app.state.redis.ping()
        logger.info("redis_connected", url=settings.redis_url)
    except Exception as exc:
        logger.warning("redis_unavailable_cache_disabled", error=str(exc))
        app.state.redis = None

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
    if app.state.redis:
        await app.state.redis.aclose()
    logger.info("shutdown", app=settings.app_name)