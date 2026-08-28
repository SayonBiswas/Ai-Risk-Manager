"""
Integration tests for POST /v1/fraud/detect
"""

import time
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from tests.conftest import create_test_merchant, make_transaction_payload


class TestFraudDetectAuth:

    @pytest.mark.asyncio
    async def test_detect_requires_auth(self, client):
        resp = await client.post("/v1/fraud/detect", json=make_transaction_payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_detect_invalid_api_key_returns_401(self, client):
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(),
            headers={"X-API-Key": "rm_invalid_key_xyz"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_detect_invalid_payload_returns_422(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/fraud/detect",
            json={"amount": -100, "currency": "XX"},  # invalid
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 422


class TestFraudDetectResponse:

    @pytest.mark.asyncio
    async def test_detect_returns_decision_and_scores(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "decision" in data
        assert data["decision"] in ("ALLOW", "FLAG", "BLOCK")
        assert 0.0 <= data["fraud_score"] <= 1.0
        assert 0.0 <= data["return_risk_score"] <= 1.0
        assert 0.0 <= data["chargeback_risk_score"] <= 1.0
        assert "reason" in data
        assert "recommended_actions" in data
        assert isinstance(data["recommended_actions"], list)
        assert "model_version" in data
        assert "latency_ms" in data

    @pytest.mark.asyncio
    async def test_detect_includes_request_id_header(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        assert "x-request-id" in resp.headers

    @pytest.mark.asyncio
    async def test_detect_low_scores_returns_allow(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        # conftest mocks all scores to low values (0.2, 0.15, 0.1)
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 200
        assert resp.json()["decision"] == "ALLOW"

    @pytest.mark.asyncio
    async def test_detect_high_fraud_score_blocks(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        with patch(
            "app.services.fraud_detector.fraud_detector.predict",
            new=AsyncMock(return_value=0.95),
        ):
            resp = await client.post(
                "/v1/fraud/detect",
                json=make_transaction_payload(),
                headers={"X-API-Key": raw_key},
            )
        assert resp.status_code == 200
        assert resp.json()["decision"] == "BLOCK"

    @pytest.mark.asyncio
    async def test_detect_blocked_transaction_has_reason(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        with patch(
            "app.services.fraud_detector.fraud_detector.predict",
            new=AsyncMock(return_value=0.95),
        ):
            resp = await client.post(
                "/v1/fraud/detect",
                json=make_transaction_payload(),
                headers={"X-API-Key": raw_key},
            )
        data = resp.json()
        assert data["reason"] != ""
        assert len(data["reason"]) > 10

    @pytest.mark.asyncio
    async def test_detect_latency_under_500ms(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        start = time.monotonic()
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        elapsed_ms = (time.monotonic() - start) * 1000
        assert resp.status_code == 200
        assert elapsed_ms < 500

    @pytest.mark.asyncio
    async def test_detect_international_transaction(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(is_international=True),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_detect_invalid_ip_returns_422(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(ip_address="not_an_ip"),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_detect_invalid_payment_method_returns_422(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(payment_method="crypto"),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 422


class TestFraudDetectRateLimit:

    @pytest.mark.asyncio
    async def test_detect_rate_limited_after_limit(self, client, db, mock_redis):
        merchant, raw_key = await create_test_merchant(db)

        # Override zcard to return count over limit
        async def over_limit_pipeline():
            pipe = AsyncMock()
            pipe.execute = AsyncMock(return_value=[0, 0, 101, True])  # zcard=101
            pipe.zremrangebyscore = AsyncMock(return_value=pipe)
            pipe.zadd = AsyncMock(return_value=pipe)
            pipe.zcard = AsyncMock(return_value=pipe)
            pipe.expire = AsyncMock(return_value=pipe)
            return pipe

        mock_redis.pipeline = AsyncMock(side_effect=over_limit_pipeline)

        resp = await client.post(
            "/v1/fraud/detect",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 429
        assert "Retry-After" in resp.headers