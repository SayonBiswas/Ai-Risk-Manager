"""
Pydantic schema for audit log entries (used in API responses if ever exposed).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogSchema(BaseModel):
    model_config = ConfigDict(strict=False, from_attributes=True)

    id: uuid.UUID
    merchant_id: uuid.UUID | None
    endpoint: str
    method: str
    status_code: int
    duration_ms: int
    payload_hash: str
    created_at: datetime