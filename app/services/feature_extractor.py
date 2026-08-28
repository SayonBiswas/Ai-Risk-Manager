"""
Feature extraction service.
Pure functions only — no DB calls, accepts history as a parameter.
All 12 features returned as a flat dict of floats ready for ML input.
"""

import math
from datetime import datetime, timezone
from decimal import Decimal

import numpy as np
import pandas as pd

from app.models.transaction import TransactionRequest


# ── MCC Risk Lookup ───────────────────────────────────────────────────────────
# Merchant Category Code → baseline risk score (0.0 low, 1.0 high)
# Based on industry chargeback rate data
MCC_RISK_MAP: dict[str, float] = {
    "5912": 0.2,  # Drug stores / pharmacies
    "5411": 0.1,  # Grocery stores
    "5812": 0.2,  # Eating places / restaurants
    "5999": 0.5,  # Miscellaneous retail
    "7995": 0.9,  # Gambling / betting
    "5816": 0.7,  # Digital goods / games
    "4816": 0.6,  # Computer network services
    "5961": 0.7,  # Catalog / mail order
    "7273": 0.8,  # Dating / escort services
    "5122": 0.4,  # Drugs / pharmaceuticals
    "4829": 0.8,  # Wire transfers / money orders
    "6051": 0.9,  # Crypto / quasi-cash
    "5944": 0.3,  # Jewelry / watches
    "5045": 0.3,  # Computers / peripherals
    "5065": 0.3,  # Electronics
    "5734": 0.4,  # Computer software
    "7011": 0.3,  # Hotels / lodging
    "4722": 0.4,  # Travel agencies
    "5311": 0.2,  # Department stores
    "5651": 0.2,  # Family clothing
}
MCC_RISK_DEFAULT = 0.4  # fallback for unknown MCCs

# ── Payment Method Encoding ───────────────────────────────────────────────────
PAYMENT_METHOD_ENCODING: dict[str, float] = {
    "upi": 0.1,        # low fraud rate in India
    "netbanking": 0.2,
    "card": 0.6,       # highest fraud surface
    "wallet": 0.3,
}


class FeatureExtractor:
    """
    Stateless feature extractor.
    All methods are pure — pass in transaction + history, get features back.
    """

    def extract(
        self,
        transaction: TransactionRequest,
        history: list[dict],
        current_time: datetime | None = None,
    ) -> dict[str, float]:
        """
        Extract all 12 ML features from a transaction and its history.

        Args:
            transaction:  Incoming TransactionRequest
            history:      List of past transaction dicts for this customer.
                          Each dict must have keys: amount (Decimal|float),
                          created_at (datetime), device_id (str|None).
            current_time: Override for "now" — used in unit tests.

        Returns:
            Flat dict[str, float] ready for model.predict()
        """
        now = current_time or datetime.now(timezone.utc)
        amount = float(transaction.amount)

        df = self._to_dataframe(history)

        features: dict[str, float] = {
            "amount_log":              self._amount_log(amount),
            "amount_zscore":           self._amount_zscore(amount, df),
            "hour_of_day":             self._hour_of_day(now),
            "is_weekend":              self._is_weekend(now),
            "velocity_1h":             self._velocity(df, now, hours=1),
            "velocity_24h":            self._velocity(df, now, hours=24),
            "amount_velocity_ratio":   self._amount_velocity_ratio(amount, df, now),
            "is_international":        float(transaction.is_international),
            "payment_method_encoded":  self._encode_payment_method(transaction.payment_method),
            "merchant_category_risk":  self._mcc_risk(transaction.merchant_category_code),
            "ip_country_mismatch":     self._ip_country_mismatch(transaction),
            "device_seen_before":      self._device_seen_before(transaction.device_id, df),
        }

        return features

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _to_dataframe(history: list[dict]) -> pd.DataFrame:
        """Convert raw history list to a typed DataFrame."""
        if not history:
            return pd.DataFrame(columns=["amount", "created_at", "device_id"])

        df = pd.DataFrame(history)

        # Normalise amount to float
        if "amount" in df.columns:
            df["amount"] = df["amount"].apply(
                lambda x: float(x) if isinstance(x, Decimal) else float(x or 0)
            )
        else:
            df["amount"] = 0.0

        # Normalise created_at to UTC-aware datetime
        if "created_at" in df.columns:
            df["created_at"] = pd.to_datetime(df["created_at"], utc=True, errors="coerce")
        else:
            df["created_at"] = pd.NaT

        if "device_id" not in df.columns:
            df["device_id"] = None

        return df

    @staticmethod
    def _amount_log(amount: float) -> float:
        """log1p of transaction amount — compresses large outliers."""
        return math.log1p(max(amount, 0.0))

    @staticmethod
    def _amount_zscore(amount: float, df: pd.DataFrame) -> float:
        """
        Z-score of current amount vs merchant's historical distribution.
        Returns 0.0 if fewer than 2 historical transactions (no variance).
        """
        if df.empty or len(df) < 2:
            return 0.0
        mean = df["amount"].mean()
        std  = df["amount"].std()
        if std == 0 or np.isnan(std):
            return 0.0
        return float((amount - mean) / std)

    @staticmethod
    def _hour_of_day(now: datetime) -> float:
        """Hour 0–23 as a float feature."""
        return float(now.hour)

    @staticmethod
    def _is_weekend(now: datetime) -> float:
        """1.0 if Saturday or Sunday, else 0.0."""
        return float(now.weekday() >= 5)

    @staticmethod
    def _velocity(df: pd.DataFrame, now: datetime, hours: int) -> float:
        """Count of transactions by this customer in the last N hours."""
        if df.empty or df["created_at"].isna().all():
            return 0.0
        cutoff = now - pd.Timedelta(hours=hours)
        # created_at is UTC-aware; now is UTC-aware
        return float((df["created_at"] >= cutoff).sum())

    @staticmethod
    def _amount_velocity_ratio(amount: float, df: pd.DataFrame, now: datetime) -> float:
        """
        Ratio of current amount to average amount in last 24 hours.
        Returns 1.0 if no 24h history (neutral).
        """
        if df.empty or df["created_at"].isna().all():
            return 1.0
        cutoff = now - pd.Timedelta(hours=24)
        recent = df[df["created_at"] >= cutoff]["amount"]
        if recent.empty or recent.mean() == 0:
            return 1.0
        return float(amount / recent.mean())

    @staticmethod
    def _encode_payment_method(method: str) -> float:
        """Ordinal risk encoding for payment method."""
        return PAYMENT_METHOD_ENCODING.get(method, 0.5)

    @staticmethod
    def _mcc_risk(mcc: str) -> float:
        """Lookup baseline risk score for a Merchant Category Code."""
        return MCC_RISK_MAP.get(mcc, MCC_RISK_DEFAULT)

    @staticmethod
    def _ip_country_mismatch(transaction: TransactionRequest) -> float:
        """
        1.0 if the transaction is flagged as international.
        Full IP geolocation lookup is added in production via a GeoIP library.
        For now: proxy using is_international flag as a safe approximation.
        """
        # TODO: integrate MaxMind GeoLite2 or ip-api.com for real geolocation
        return float(transaction.is_international)

    @staticmethod
    def _device_seen_before(device_id: str | None, df: pd.DataFrame) -> float:
        """
        1.0 if device_id appears in customer's transaction history, else 0.0.
        0.0 if device_id is None (unknown device = higher risk signal).
        """
        if not device_id or df.empty:
            return 0.0
        known_devices = df["device_id"].dropna().tolist()
        return float(device_id in known_devices)