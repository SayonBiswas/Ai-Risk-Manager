"""
Integration tests for POST /v1/returns/score
"""

import pytest
from tests.conftest import create_test_merchant, make_transaction_payload


class TestReturnScoreAPI:

    @pytest.mark.asyncio
    async def test_score_requires_auth(self, client):
        resp = await client.post("/v1/returns/score", json=make_transaction_payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_score_returns_risk_band(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/returns/score",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["risk_band"] in ("LOW", "MEDIUM", "HIGH")
        assert 0.0 <= data["return_risk_score"] <= 1.0
        assert isinstance(data["recommended_actions"], list)
        assert len(data["recommended_actions"]) > 0

    @pytest.mark.asyncio
    async def test_score_includes_model_version(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/returns/score",
            json=make_transaction_payload(),
            headers={"X-API-Key": raw_key},
        )
        assert "model_version" in resp.json()

    @pytest.mark.asyncio
    async def test_score_invalid_payload_returns_422(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/returns/score",
            json={"amount": "bad"},
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 422