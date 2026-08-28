"""
Integration tests for chargeback endpoints.
"""

import pytest
from datetime import date, timedelta
from tests.conftest import create_test_merchant, create_test_transaction


class TestChargebackStatus:

    @pytest.mark.asyncio
    async def test_status_requires_auth(self, client):
        resp = await client.get("/v1/chargebacks/txn_unknown/status")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_status_not_found_returns_not_found_status(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.get(
            "/v1/chargebacks/txn_does_not_exist/status",
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_status_returns_correct_schema(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.get(
            "/v1/chargebacks/txn_xyz/status",
            headers={"X-API-Key": raw_key},
        )
        data = resp.json()
        assert "transaction_id" in data
        assert "status" in data


class TestChargebackRespond:

    @pytest.mark.asyncio
    async def test_respond_requires_auth(self, client):
        resp = await client.post(
            "/v1/chargebacks/respond",
            json={
                "transaction_id": "txn_001",
                "chargeback_reason_code": "4853",
                "amount": "500.00",
                "dispute_deadline": str(date.today() + timedelta(days=10)),
            },
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_respond_past_deadline_returns_422(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/chargebacks/respond",
            json={
                "transaction_id": "txn_001",
                "chargeback_reason_code": "4853",
                "amount": "500.00",
                "dispute_deadline": "2020-01-01",  # past date
            },
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_respond_transaction_not_found_returns_404(self, client, db):
        merchant, raw_key = await create_test_merchant(db)
        resp = await client.post(
            "/v1/chargebacks/respond",
            json={
                "transaction_id": "txn_not_in_db",
                "chargeback_reason_code": "4853",
                "amount": "500.00",
                "dispute_deadline": str(date.today() + timedelta(days=10)),
            },
            headers={"X-API-Key": raw_key},
        )
        assert resp.status_code == 404