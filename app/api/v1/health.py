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