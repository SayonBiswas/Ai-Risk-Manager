"""
Pydantic v2 request and response schemas for all API endpoints.
"""

import ipaddress
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_ip(v: str) -> str:
    try:
        ipaddress.ip_address(v)
        return v
    except ValueError:
        raise ValueError(f"Invalid IP address: {v}")


# ── Transaction Request ───────────────────────────────────────────────────────

class TransactionRequest(BaseModel):
    model_config = ConfigDict(strict=False)

    transaction_id: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(..., min_length=3, max_length=3)
    customer_id: str = Field(..., min_length=1, max_length=255)
    payment_method: Literal["card", "upi", "netbanking", "wallet"]
    device_id: str | None = Field(default=None, max_length=255)
    ip_address: str = Field(..., max_length=45)
    merchant_category_code: str = Field(..., min_length=1, max_length=10)
    is_international: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v: Any) -> Decimal:
        try:
            return Decimal(str(v))
        except InvalidOperation:
            raise ValueError(f"Invalid amount: {v}")

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        return _validate_ip(v)

    @field_validator("currency")
    @classmethod
    def validate_currency_uppercase(cls, v: str) -> str:
        if not v.isalpha():
            raise ValueError("Currency must contain only letters (e.g. INR, USD)")
        return v.upper()


# ── Risk Score Response ───────────────────────────────────────────────────────

class RiskScoreResponse(BaseModel):
    model_config = ConfigDict(strict=False)

    transaction_id: str
    decision: Literal["ALLOW", "FLAG", "BLOCK"]
    fraud_score: Annotated[float, Field(ge=0.0, le=1.0)]
    return_risk_score: Annotated[float, Field(ge=0.0, le=1.0)]
    chargeback_risk_score: Annotated[float, Field(ge=0.0, le=1.0)]
    reason: str
    recommended_actions: list[str]
    model_version: str
    latency_ms: int


# ── Chargeback Schemas ────────────────────────────────────────────────────────

class ChargebackEvidenceRequest(BaseModel):
    model_config = ConfigDict(strict=False)

    transaction_id: str = Field(..., min_length=1, max_length=255)
    chargeback_reason_code: str = Field(..., min_length=1, max_length=50)
    amount: Decimal = Field(..., gt=0)
    dispute_deadline: date

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v: Any) -> Decimal:
        try:
            return Decimal(str(v))
        except InvalidOperation:
            raise ValueError(f"Invalid amount: {v}")

    @field_validator("dispute_deadline", mode="before")
    @classmethod
    def validate_deadline_format(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError("dispute_deadline must be YYYY-MM-DD format")
        return v

    @model_validator(mode="after")
    def validate_deadline_not_past(self) -> "ChargebackEvidenceRequest":
        if self.dispute_deadline < date.today():
            raise ValueError("dispute_deadline cannot be in the past")
        return self


class ChargebackEvidenceResponse(BaseModel):
    model_config = ConfigDict(strict=False)

    transaction_id: str
    evidence_summary: str
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    evidence_documents: list[str]
    recommended_response: str


class ChargebackStatusResponse(BaseModel):
    model_config = ConfigDict(strict=False)

    transaction_id: str
    decision: Literal["ALLOW", "FLAG", "BLOCK"] | None
    chargeback_risk_score: float | None
    llm_reason: str | None
    status: Literal["pending", "evidence_ready", "not_found"]


# ── Return Risk Schemas ───────────────────────────────────────────────────────

class ReturnRiskResponse(BaseModel):
    model_config = ConfigDict(strict=False)

    transaction_id: str
    return_risk_score: Annotated[float, Field(ge=0.0, le=1.0)]
    risk_band: Literal["LOW", "MEDIUM", "HIGH"]
    recommended_actions: list[str]
    model_version: str
    latency_ms: int