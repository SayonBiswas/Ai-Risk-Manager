"""
LLM-powered reason generator using Google Gemini API.
Handles fraud explanation and chargeback evidence generation.
Caches responses in Redis with 10-minute TTL.
Retries on 5xx with exponential backoff.
Falls back to template strings if Gemini call fails.
"""

import json
import asyncio
from datetime import datetime, timezone

import google.generativeai as genai
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.transaction import (
    ChargebackEvidenceResponse,
    TransactionRequest,
)

settings = get_settings()
logger = get_logger(__name__)

# Configure Gemini client once at module load
genai.configure(api_key=settings.gemini_api_key)

CACHE_TTL_SECONDS = 600  # 10 minutes

# ── System prompts ────────────────────────────────────────────────────────────

FRAUD_SYSTEM_PROMPT = """You are a risk analyst at a payment gateway.
Given transaction features and risk scores, write a concise 2-3 sentence 
explanation of the risk decision for the merchant. Be specific about which 
signals drove the decision. Do not reveal model internals or raw score numbers.
Be factual, not alarmist. Write in plain business English."""

CHARGEBACK_SYSTEM_PROMPT = """You are a payments dispute specialist at a payment gateway.
Given a transaction and customer history, draft a professional chargeback dispute response
that a merchant can submit to their acquiring bank. Be factual, structured, and concise.
Reference specific transaction details. Output valid JSON only — no markdown, no preamble."""


# ── Gemini caller ─────────────────────────────────────────────────────────────

class _GeminiError(Exception):
    """Raised when Gemini returns a retryable server error."""


@retry(
    retry=retry_if_exception_type(_GeminiError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=False,
)
async def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    """
    Call Gemini with system + user prompt.
    Retries up to 3 times with exponential backoff on transient errors.
    Returns raw text response.
    """
    try:
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=system_prompt,
        )
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(user_prompt),
        )
        return response.text.strip()
    except Exception as exc:
        err_str = str(exc).lower()
        if any(code in err_str for code in ["500", "503", "429", "server error"]):
            raise _GeminiError(str(exc)) from exc
        # Non-retryable — raise immediately
        raise


# ── LLMReasoner ───────────────────────────────────────────────────────────────

class LLMReasoner:
    """
    Generates LLM-powered explanations for risk decisions
    and chargeback dispute responses.
    """

    def __init__(self, redis=None):
        """
        Args:
            redis: Redis async client (injected from app.state.redis).
                   Pass None to disable caching (e.g. in tests).
        """
        self._redis = redis

    # ── Cache helpers ─────────────────────────────────────────────────────────

    async def _cache_get(self, key: str) -> str | None:
        if not self._redis:
            return None
        try:
            return await self._redis.get(key)
        except Exception as exc:
            logger.warning("redis_cache_get_failed", key=key, error=str(exc))
            return None

    async def _cache_set(self, key: str, value: str) -> None:
        if not self._redis:
            return
        try:
            await self._redis.setex(key, CACHE_TTL_SECONDS, value)
        except Exception as exc:
            logger.warning("redis_cache_set_failed", key=key, error=str(exc))

    # ── Fraud reason ──────────────────────────────────────────────────────────

    async def generate_reason(
        self,
        transaction: TransactionRequest,
        features: dict,
        fraud_score: float,
        return_score: float,
        cb_score: float,
        decision: str,
    ) -> str:
        """
        Generate a 2-3 sentence risk decision explanation for the merchant.
        Cached in Redis by transaction_id for 10 minutes.
        Falls back to a template string if Gemini fails.
        """
        cache_key = f"llm_reason:{transaction.transaction_id}"
        cached = await self._cache_get(cache_key)
        if cached:
            logger.info("llm_reason_cache_hit", transaction_id=transaction.transaction_id)
            return cached

        user_prompt = _build_fraud_prompt(
            transaction, features, fraud_score, return_score, cb_score, decision
        )

        try:
            reason = await _call_gemini(FRAUD_SYSTEM_PROMPT, user_prompt)
            await self._cache_set(cache_key, reason)
            logger.info(
                "llm_reason_generated",
                transaction_id=transaction.transaction_id,
                decision=decision,
            )
            return reason
        except Exception as exc:
            logger.warning(
                "llm_reason_fallback",
                transaction_id=transaction.transaction_id,
                error=str(exc),
            )
            return _fallback_reason(transaction, fraud_score, decision)

    # ── Chargeback evidence ───────────────────────────────────────────────────

    async def generate_chargeback_evidence(
        self,
        transaction: dict,
        history: list[dict],
    ) -> ChargebackEvidenceResponse:
        """
        Draft a chargeback dispute response package using Gemini.
        Cached by transaction_id for 10 minutes.
        Falls back to a structured template if Gemini fails.
        """
        txn_id = transaction.get("transaction_id", "unknown")
        cache_key = f"llm_cb_evidence:{txn_id}"
        cached = await self._cache_get(cache_key)

        if cached:
            logger.info("llm_cb_cache_hit", transaction_id=txn_id)
            try:
                data = json.loads(cached)
                return ChargebackEvidenceResponse(**data)
            except Exception:
                pass  # corrupted cache — regenerate

        user_prompt = _build_chargeback_prompt(transaction, history)

        try:
            raw = await _call_gemini(CHARGEBACK_SYSTEM_PROMPT, user_prompt)
            # Strip markdown fences if Gemini wraps in ```json
            clean = raw.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean)

            response = ChargebackEvidenceResponse(
                transaction_id=txn_id,
                evidence_summary=data.get("evidence_summary", ""),
                confidence=float(data.get("confidence", 0.7)),
                evidence_documents=data.get("evidence_documents", []),
                recommended_response=data.get("recommended_response", ""),
            )

            await self._cache_set(cache_key, response.model_dump_json())
            logger.info("llm_cb_evidence_generated", transaction_id=txn_id)
            return response

        except Exception as exc:
            logger.warning(
                "llm_cb_evidence_fallback",
                transaction_id=txn_id,
                error=str(exc),
            )
            return _fallback_chargeback_evidence(transaction)


# ── Prompt builders ───────────────────────────────────────────────────────────

def _build_fraud_prompt(
    transaction: TransactionRequest,
    features: dict,
    fraud_score: float,
    return_score: float,
    cb_score: float,
    decision: str,
) -> str:
    # Translate raw features into readable signals for the LLM
    signals = []

    if features.get("velocity_1h", 0) > 3:
        signals.append(f"high transaction velocity ({features['velocity_1h']:.0f} txns in last hour)")
    if features.get("is_international"):
        signals.append("international transaction")
    if features.get("ip_country_mismatch"):
        signals.append("IP country mismatch with billing country")
    if not features.get("device_seen_before"):
        signals.append("unrecognised device")
    if features.get("amount_zscore", 0) > 2:
        signals.append(f"unusually high amount (z-score {features['amount_zscore']:.1f})")
    if features.get("merchant_category_risk", 0) > 0.6:
        signals.append("high-risk merchant category")
    if features.get("amount_velocity_ratio", 1) > 3:
        signals.append(f"amount {features['amount_velocity_ratio']:.1f}x above customer average")

    signals_text = "; ".join(signals) if signals else "no strong individual signals"

    return f"""Transaction Analysis Request:

Transaction ID: {transaction.transaction_id}
Amount: {transaction.currency} {transaction.amount}
Payment Method: {transaction.payment_method}
International: {transaction.is_international}
Decision: {decision}

Risk Signals Detected: {signals_text}

Risk Band Summary:
- Fraud risk: {"HIGH" if fraud_score > 0.7 else "MEDIUM" if fraud_score > 0.4 else "LOW"}
- Return risk: {"HIGH" if return_score > 0.7 else "MEDIUM" if return_score > 0.4 else "LOW"}
- Chargeback risk: {"HIGH" if cb_score > 0.7 else "MEDIUM" if cb_score > 0.4 else "LOW"}

Write a 2-3 sentence explanation of this decision for the merchant."""


def _build_chargeback_prompt(transaction: dict, history: list[dict]) -> str:
    txn_date = transaction.get("created_at", datetime.now(timezone.utc))
    customer_txn_count = len(history)
    total_spend = sum(float(h.get("amount", 0)) for h in history)
    has_prior_chargebacks = any(h.get("had_chargeback") for h in history)

    return f"""Chargeback Dispute — Draft Response

Transaction Details:
  ID:              {transaction.get("transaction_id")}
  Amount:          {transaction.get("currency", "INR")} {transaction.get("amount")}
  Date:            {txn_date}
  Payment Method:  {transaction.get("payment_method")}
  Customer ID:     {transaction.get("customer_id")}
  Device ID:       {transaction.get("device_id", "N/A")}
  IP Address:      {transaction.get("ip_address")}
  International:   {transaction.get("is_international", False)}

Customer History:
  Total transactions with merchant: {customer_txn_count}
  Total lifetime spend: {transaction.get("currency", "INR")} {total_spend:.2f}
  Prior chargebacks: {"Yes" if has_prior_chargebacks else "None"}

Reason Code: {transaction.get("chargeback_reason_code", "N/A")}
Dispute Deadline: {transaction.get("dispute_deadline", "N/A")}

Respond ONLY with a JSON object in this exact format:
{{
  "evidence_summary": "2-3 sentence summary of the evidence",
  "confidence": 0.85,
  "evidence_documents": [
    "Transaction receipt dated ...",
    "Device fingerprint match confirmation",
    "Customer order history showing X prior transactions"
  ],
  "recommended_response": "Step-by-step recommended dispute response"
}}"""


# ── Fallback templates ────────────────────────────────────────────────────────

def _fallback_reason(
    transaction: TransactionRequest,
    fraud_score: float,
    decision: str,
) -> str:
    if decision == "BLOCK":
        return (
            f"Transaction {transaction.transaction_id} was blocked due to elevated risk signals "
            f"including payment pattern anomalies and risk indicators associated with this "
            f"transaction type. We recommend contacting the customer through a verified channel "
            f"before retrying."
        )
    if decision == "FLAG":
        return (
            f"Transaction {transaction.transaction_id} has been flagged for manual review. "
            f"One or more risk factors — including transaction velocity, amount, or device signals — "
            f"require further verification before this transaction can be approved."
        )
    return (
        f"Transaction {transaction.transaction_id} has been approved. "
        f"All risk signals are within acceptable thresholds for this merchant category."
    )


def _fallback_chargeback_evidence(transaction: dict) -> ChargebackEvidenceResponse:
    txn_id = transaction.get("transaction_id", "unknown")
    amount = transaction.get("amount", "N/A")
    currency = transaction.get("currency", "INR")
    return ChargebackEvidenceResponse(
        transaction_id=txn_id,
        evidence_summary=(
            f"Transaction {txn_id} for {currency} {amount} was processed successfully "
            f"with full authentication. Device and IP records are available for review."
        ),
        confidence=0.6,
        evidence_documents=[
            f"Transaction receipt: {txn_id}",
            "Device fingerprint log",
            "IP address and session record",
            "Customer transaction history",
        ],
        recommended_response=(
            "Submit transaction receipt, device fingerprint confirmation, and customer "
            "order history to the acquiring bank. Request the cardholder's bank to "
            "provide specific fraud claim evidence before the dispute deadline."
        ),
    )


# ── Singleton factory ─────────────────────────────────────────────────────────

def get_llm_reasoner(redis=None) -> LLMReasoner:
    """
    Return an LLMReasoner instance.
    In endpoints, pass request.app.state.redis as the redis argument.
    """
    return LLMReasoner(redis=redis)