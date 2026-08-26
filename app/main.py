from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
from app.core.config import settings

# Initialize structured JSON logging
logger = structlog.get_logger()

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)

# Setup CORS (Adjust allow_origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: Register Middleware (e.g., Auth, Rate Limiting, Audit Logger)
# TODO: Include API Routers (e.g., /v1/fraud, /v1/chargebacks, /v1/returns)

@app.get("/health")
async def health_check():
    """System health check endpoint."""
    return {"status": "ok", "version": settings.VERSION}