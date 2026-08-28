"""
Unit tests for FeatureExtractor.
Covers edge cases: new customer, missing device, zero history, large amounts.
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.services.feature_extractor import FeatureExtractor
from app.models.transaction import TransactionRequest


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_transaction(**overrides) -> TransactionRequest:
    base = dict(
        transaction_id="txn_001",
        amount=Decimal("500.00"),
        currency="INR",
        customer_id="cust_001",
        payment_method="card",
        device_id="device_abc",
        ip_address="203.0.113.1",
        merchant_category_code="5816",
        is_international=False,
        metadata={},
    )
    base.update(overrides)
    return TransactionRequest(**base)


def make_history(n: int, amount: float = 500.0, device_id: str = "device_abc") -> list[dict]:
    now = datetime.now(timezone.utc)
    return [
        {
            "amount": Decimal(str(amount)),
            "created_at": now - timedelta(hours=i + 1),
            "device_id": device_id,
        }
        for i in range(n)
    ]


FIXED_TIME = datetime(2024, 6, 15, 14, 30, 0, tzinfo=timezone.utc)  # Saturday 14:30


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestFeatureExtractor:
    extractor = FeatureExtractor()

    def test_returns_all_12_features(self):
        txn = make_transaction()
        features = self.extractor.extract(txn, make_history(5), current_time=FIXED_TIME)
        expected_keys = {
            "amount_log", "amount_zscore", "hour_of_day", "is_weekend",
            "velocity_1h", "velocity_24h", "amount_velocity_ratio",
            "is_international", "payment_method_encoded", "merchant_category_risk",
            "ip_country_mismatch", "device_seen_before",
        }
        assert set(features.keys()) == expected_keys

    def test_all_values_are_floats(self):
        txn = make_transaction()
        features = self.extractor.extract(txn, make_history(5), current_time=FIXED_TIME)
        for key, val in features.items():
            assert isinstance(val, float), f"{key} is not float: {type(val)}"

    def test_new_customer_zero_history(self):
        txn = make_transaction()
        features = self.extractor.extract(txn, [], current_time=FIXED_TIME)
        assert features["velocity_1h"] == 0.0
        assert features["velocity_24h"] == 0.0
        assert features["amount_zscore"] == 0.0
        assert features["amount_velocity_ratio"] == 1.0
        assert features["device_seen_before"] == 0.0

    def test_missing_device_id(self):
        txn = make_transaction(device_id=None)
        features = self.extractor.extract(txn, make_history(5), current_time=FIXED_TIME)
        assert features["device_seen_before"] == 0.0

    def test_known_device_reduces_risk(self):
        txn = make_transaction(device_id="device_abc")
        features = self.extractor.extract(txn, make_history(5, device_id="device_abc"), current_time=FIXED_TIME)
        assert features["device_seen_before"] == 1.0

    def test_unknown_device_is_zero(self):
        txn = make_transaction(device_id="new_device_xyz")
        features = self.extractor.extract(txn, make_history(5, device_id="device_abc"), current_time=FIXED_TIME)
        assert features["device_seen_before"] == 0.0

    def test_velocity_spike(self):
        now = datetime.now(timezone.utc)
        # 5 transactions in last 30 minutes
        history = [
            {"amount": Decimal("100"), "created_at": now - timedelta(minutes=i * 5), "device_id": "d"}
            for i in range(1, 6)
        ]
        txn = make_transaction()
        features = self.extractor.extract(txn, history, current_time=now)
        assert features["velocity_1h"] == 5.0
        assert features["velocity_24h"] == 5.0

    def test_international_flag(self):
        txn = make_transaction(is_international=True)
        features = self.extractor.extract(txn, [], current_time=FIXED_TIME)
        assert features["is_international"] == 1.0
        assert features["ip_country_mismatch"] == 1.0

    def test_weekend_detection(self):
        # FIXED_TIME is a Saturday
        txn = make_transaction()
        features = self.extractor.extract(txn, [], current_time=FIXED_TIME)
        assert features["is_weekend"] == 1.0

    def test_weekday_detection(self):
        monday = datetime(2024, 6, 17, 10, 0, 0, tzinfo=timezone.utc)
        txn = make_transaction()
        features = self.extractor.extract(txn, [], current_time=monday)
        assert features["is_weekend"] == 0.0

    def test_amount_log_positive(self):
        txn = make_transaction(amount=Decimal("1000.00"))
        features = self.extractor.extract(txn, [], current_time=FIXED_TIME)
        import math
        assert abs(features["amount_log"] - math.log1p(1000.0)) < 1e-6

    def test_high_amount_zscore(self):
        # History of small amounts, current txn is very large
        history = make_history(10, amount=100.0)
        txn = make_transaction(amount=Decimal("10000.00"))
        features = self.extractor.extract(txn, history, current_time=FIXED_TIME)
        assert features["amount_zscore"] > 3.0  # clear outlier

    def test_mcc_risk_known_code(self):
        txn = make_transaction(merchant_category_code="7995")  # gambling
        features = self.extractor.extract(txn, [], current_time=FIXED_TIME)
        assert features["merchant_category_risk"] == 0.9

    def test_mcc_risk_unknown_code_uses_default(self):
        txn = make_transaction(merchant_category_code="9999")
        features = self.extractor.extract(txn, [], current_time=FIXED_TIME)
        assert features["merchant_category_risk"] == 0.4  # MCC_RISK_DEFAULT

    def test_card_payment_encoded_higher_than_upi(self):
        card_txn = make_transaction(payment_method="card")
        upi_txn  = make_transaction(payment_method="upi")
        card_features = self.extractor.extract(card_txn, [], current_time=FIXED_TIME)
        upi_features  = self.extractor.extract(upi_txn,  [], current_time=FIXED_TIME)
        assert card_features["payment_method_encoded"] > upi_features["payment_method_encoded"]

    def test_amount_velocity_ratio_spike(self):
        # History avg = 100, current txn = 1000 → ratio = 10
        history = make_history(5, amount=100.0)
        txn = make_transaction(amount=Decimal("1000.00"))
        features = self.extractor.extract(txn, history, current_time=FIXED_TIME)
        assert abs(features["amount_velocity_ratio"] - 10.0) < 0.5