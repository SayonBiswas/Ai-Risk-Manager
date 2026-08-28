"""
Runtime scoring services — load models once on startup, predict per request.
"""

import asyncio
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

FEATURE_ORDER = [
    "amount_log",
    "amount_zscore",
    "hour_of_day",
    "is_weekend",
    "velocity_1h",
    "velocity_24h",
    "amount_velocity_ratio",
    "is_international",
    "payment_method_encoded",
    "merchant_category_risk",
    "ip_country_mismatch",
    "device_seen_before",
]


def _features_to_array(features: dict[str, float]) -> np.ndarray:
    """Convert feature dict to numpy array in the correct column order."""
    return np.array([[features.get(k, 0.0) for k in FEATURE_ORDER]], dtype=np.float32)


# ── Fraud Detector ────────────────────────────────────────────────────────────

class FraudDetectorService:
    """
    Wraps the XGBoost fraud model.
    Model is loaded once into memory on first use and cached.
    """

    def __init__(self):
        self._model = None
        self._model_version = settings.model_version

    def load_model(self) -> None:
        path = Path(settings.model_dir) / "fraud_model.joblib"
        if not path.exists():
            logger.warning("fraud_model_not_found", path=str(path))
            self._model = None
            return
        self._model = joblib.load(path)
        logger.info("fraud_model_loaded", version=self._model_version, path=str(path))

    async def predict(self, features: dict[str, float]) -> float:
        """
        Return fraud probability score 0.0–1.0.
        Falls back to a rule-based heuristic if model is not loaded.
        """
        if self._model is None:
            return self._heuristic_score(features)

        loop = asyncio.get_event_loop()
        X = _features_to_array(features)
        prob = await loop.run_in_executor(
            None, lambda: float(self._model.predict_proba(X)[0][1])
        )
        return round(prob, 4)

    @staticmethod
    def _heuristic_score(features: dict[str, float]) -> float:
        """
        Simple rule-based fallback when model file is missing.
        Used during development before first training run.
        """
        score = 0.0
        score += min(features.get("velocity_1h", 0) * 0.1, 0.3)
        score += features.get("is_international", 0) * 0.2
        score += features.get("merchant_category_risk", 0) * 0.2
        score += min(max(features.get("amount_zscore", 0) - 2, 0) * 0.05, 0.2)
        score += (1 - features.get("device_seen_before", 0)) * 0.1
        return round(min(score, 1.0), 4)


# ── Return Risk Scorer ────────────────────────────────────────────────────────

class ReturnRiskService:
    """Wraps the LightGBM return-risk model."""

    def __init__(self):
        self._model = None
        self._model_version = settings.model_version

    def load_model(self) -> None:
        path = Path(settings.model_dir) / "return_model.joblib"
        if not path.exists():
            logger.warning("return_model_not_found", path=str(path))
            self._model = None
            return
        self._model = joblib.load(path)
        logger.info("return_model_loaded", version=self._model_version)

    async def predict(self, features: dict[str, float]) -> float:
        if self._model is None:
            return self._heuristic_score(features)

        loop = asyncio.get_event_loop()
        X = _features_to_array(features)
        prob = await loop.run_in_executor(
            None, lambda: float(self._model.predict_proba(X)[0][1])
        )
        return round(prob, 4)

    @staticmethod
    def _heuristic_score(features: dict[str, float]) -> float:
        score = 0.0
        score += features.get("is_international", 0) * 0.3
        score += features.get("merchant_category_risk", 0) * 0.3
        score += min(features.get("amount_velocity_ratio", 1) - 1, 1) * 0.2
        score += features.get("payment_method_encoded", 0) * 0.2
        return round(min(score, 1.0), 4)


# ── Chargeback Risk Scorer ────────────────────────────────────────────────────

class ChargebackRiskService:
    """
    Ensemble: IsolationForest anomaly score + Logistic Regression probability.
    Final score = average of both.
    """

    def __init__(self):
        self._models = None
        self._model_version = settings.model_version

    def load_model(self) -> None:
        path = Path(settings.model_dir) / "cb_model.joblib"
        if not path.exists():
            logger.warning("cb_model_not_found", path=str(path))
            self._models = None
            return
        self._models = joblib.load(path)
        logger.info("cb_model_loaded", version=self._model_version)

    async def predict(self, features: dict[str, float]) -> float:
        if self._models is None:
            return self._heuristic_score(features)

        loop = asyncio.get_event_loop()
        X = _features_to_array(features)

        def _score():
            iso = self._models["isolation_forest"]
            lr  = self._models["logistic_regression"]

            # IsolationForest: negative score_samples = more anomalous
            iso_raw = float(iso.score_samples(X)[0])
            # Normalise to 0-1: lower score_samples → higher risk
            iso_score = float(np.clip(1 - (iso_raw + 0.5), 0, 1))

            lr_score = float(lr.predict_proba(X)[0][1])

            return round((iso_score + lr_score) / 2, 4)

        return await loop.run_in_executor(None, _score)

    @staticmethod
    def _heuristic_score(features: dict[str, float]) -> float:
        score = 0.0
        score += features.get("merchant_category_risk", 0) * 0.4
        score += features.get("is_international", 0) * 0.3
        score += features.get("payment_method_encoded", 0) * 0.3
        return round(min(score, 1.0), 4)


# ── Singletons (loaded at app startup) ───────────────────────────────────────

fraud_detector    = FraudDetectorService()
return_risk       = ReturnRiskService()
chargeback_risk   = ChargebackRiskService()


def load_all_models() -> None:
    """Call this once in app startup event."""
    fraud_detector.load_model()
    return_risk.load_model()
    chargeback_risk.load_model()