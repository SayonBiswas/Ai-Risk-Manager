"""
Unit tests for ML scoring services and decision rules.
"""

import pytest
from unittest.mock import AsyncMock, patch
from decimal import Decimal

from app.models.risk_score import RiskScores, RiskDecisionResult
from app.services.fraud_detector import (
    FraudDetectorService,
    ReturnRiskService,
    ChargebackRiskService,
)


# ── Decision rule tests ───────────────────────────────────────────────────────

class TestRiskDecisionResult:

    def test_high_fraud_score_blocks_transaction(self):
        scores = RiskScores(fraud_score=0.85, return_risk_score=0.1, chargeback_risk_score=0.1)
        result = RiskDecisionResult.from_scores(scores)
        assert result.decision == "BLOCK"

    def test_low_fraud_score_allows_transaction(self):
        scores = RiskScores(fraud_score=0.2, return_risk_score=0.1, chargeback_risk_score=0.1)
        result = RiskDecisionResult.from_scores(scores)
        assert result.decision == "ALLOW"

    def test_medium_fraud_score_flags_transaction(self):
        scores = RiskScores(fraud_score=0.6, return_risk_score=0.1, chargeback_risk_score=0.1)
        result = RiskDecisionResult.from_scores(scores)
        assert result.decision == "FLAG"

    def test_high_chargeback_score_flags_transaction(self):
        scores = RiskScores(fraud_score=0.3, return_risk_score=0.1, chargeback_risk_score=0.75)
        result = RiskDecisionResult.from_scores(scores)
        assert result.decision == "FLAG"

    def test_block_includes_block_actions(self):
        scores = RiskScores(fraud_score=0.9, return_risk_score=0.1, chargeback_risk_score=0.1)
        result = RiskDecisionResult.from_scores(scores)
        assert any("block" in a.lower() for a in result.recommended_actions)

    def test_allow_includes_no_action_message(self):
        scores = RiskScores(fraud_score=0.1, return_risk_score=0.1, chargeback_risk_score=0.1)
        result = RiskDecisionResult.from_scores(scores)
        assert any("approved" in a.lower() or "no action" in a.lower() for a in result.recommended_actions)

    def test_boundary_fraud_score_081_blocks(self):
        scores = RiskScores(fraud_score=0.81, return_risk_score=0.0, chargeback_risk_score=0.0)
        result = RiskDecisionResult.from_scores(scores)
        assert result.decision == "BLOCK"

    def test_boundary_fraud_score_080_flags(self):
        # Exactly 0.8 → not > 0.8 → FLAG (0.8 > 0.5)
        scores = RiskScores(fraud_score=0.80, return_risk_score=0.0, chargeback_risk_score=0.0)
        result = RiskDecisionResult.from_scores(scores)
        assert result.decision == "FLAG"


# ── Heuristic fallback tests ──────────────────────────────────────────────────

class TestHeuristicFallback:

    def test_velocity_spike_increases_fraud_score(self):
        features = {
            "velocity_1h": 10.0,
            "is_international": 0.0,
            "merchant_category_risk": 0.2,
            "amount_zscore": 0.0,
            "device_seen_before": 1.0,
        }
        score = FraudDetectorService._heuristic_score(features)
        assert score > 0.5

    def test_international_card_risk_premium(self):
        domestic = {"is_international": 0.0, "velocity_1h": 0.0,
                    "merchant_category_risk": 0.2, "amount_zscore": 0.0, "device_seen_before": 1.0}
        intl     = {"is_international": 1.0, "velocity_1h": 0.0,
                    "merchant_category_risk": 0.2, "amount_zscore": 0.0, "device_seen_before": 1.0}
        assert FraudDetectorService._heuristic_score(intl) > FraudDetectorService._heuristic_score(domestic)

    def test_known_device_reduces_score(self):
        seen     = {"device_seen_before": 1.0, "is_international": 0.0,
                    "velocity_1h": 0.0, "merchant_category_risk": 0.2, "amount_zscore": 0.0}
        unseen   = {"device_seen_before": 0.0, "is_international": 0.0,
                    "velocity_1h": 0.0, "merchant_category_risk": 0.2, "amount_zscore": 0.0}
        assert FraudDetectorService._heuristic_score(seen) < FraudDetectorService._heuristic_score(unseen)

    def test_score_never_exceeds_1(self):
        features = {
            "velocity_1h": 100.0,
            "is_international": 1.0,
            "merchant_category_risk": 1.0,
            "amount_zscore": 10.0,
            "device_seen_before": 0.0,
        }
        assert FraudDetectorService._heuristic_score(features) <= 1.0

    def test_high_mcc_risk_increases_return_score(self):
        low  = {"merchant_category_risk": 0.1, "is_international": 0.0, "amount_velocity_ratio": 1.0, "payment_method_encoded": 0.1}
        high = {"merchant_category_risk": 0.9, "is_international": 0.0, "amount_velocity_ratio": 1.0, "payment_method_encoded": 0.1}
        assert ReturnRiskService._heuristic_score(high) > ReturnRiskService._heuristic_score(low)


# ── Async predict tests ───────────────────────────────────────────────────────

class TestAsyncPredict:

    @pytest.mark.asyncio
    async def test_fraud_predict_returns_float_without_model(self):
        service = FraudDetectorService()
        score = await service.predict({"velocity_1h": 1.0, "is_international": 0.0,
                                       "merchant_category_risk": 0.2, "amount_zscore": 0.0,
                                       "device_seen_before": 1.0})
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

    @pytest.mark.asyncio
    async def test_return_predict_returns_float_without_model(self):
        service = ReturnRiskService()
        score = await service.predict({"merchant_category_risk": 0.3, "is_international": 0.0,
                                       "amount_velocity_ratio": 1.0, "payment_method_encoded": 0.2})
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

    @pytest.mark.asyncio
    async def test_chargeback_predict_returns_float_without_model(self):
        service = ChargebackRiskService()
        score = await service.predict({"merchant_category_risk": 0.3, "is_international": 0.0,
                                       "payment_method_encoded": 0.2})
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0