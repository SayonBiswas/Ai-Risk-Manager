"""
GET /v1/transactions
GET /v1/transactions/stats
GET /v1/transactions/{transaction_id}
Transaction data endpoints for merchants.
"""

import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import authenticated
from app.db.session import get_db
from app.db.models import Transaction, RiskDecision, DecisionEnum
from app.models.transaction import (
    TransactionListItem,
    TransactionListResponse,
    TransactionStatsResponse,
    TransactionDetailResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=TransactionListResponse,
    summary="List transactions",
    description=(
        "Retrieve paginated list of transactions for the authenticated merchant. "
        "Supports filtering by decision type and date range."
    ),
    status_code=status.HTTP_200_OK,
)
async def list_transactions(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    decision: Optional[Literal["ALLOW", "FLAG", "BLOCK"]] = Query(
        None, description="Filter by decision type"
    ),
    from_date: Optional[date] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current: dict = Depends(authenticated),
    db: AsyncSession = Depends(get_db),
) -> TransactionListResponse:
    merchant_id = uuid.UUID(current["merchant_id"])

    # Build base query with JOIN
    query = (
        select(Transaction, RiskDecision)
        .join(RiskDecision, Transaction.id == RiskDecision.transaction_id)
        .where(Transaction.merchant_id == merchant_id)
    )

    # Apply filters
    conditions = []
    if decision:
        conditions.append(RiskDecision.decision == DecisionEnum[decision])
    if from_date:
        from_datetime = datetime.combine(from_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        conditions.append(Transaction.created_at >= from_datetime)
    if to_date:
        to_datetime = datetime.combine(to_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        conditions.append(Transaction.created_at <= to_datetime)

    if conditions:
        query = query.where(and_(*conditions))

    # Get total count using the same filters
    count_conditions = [Transaction.merchant_id == merchant_id]
    if conditions:
        count_conditions.extend(conditions)
    
    count_result = await db.execute(
        select(func.count(Transaction.id))
        .join(RiskDecision, Transaction.id == RiskDecision.transaction_id)
        .where(and_(*count_conditions))
    )
    total = count_result.scalar() or 0

    # Calculate pages
    pages = (total + limit - 1) // limit if total > 0 else 0

    # Apply pagination and ordering
    query = query.order_by(Transaction.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    # Execute query
    result = await db.execute(query)
    rows = result.all()

    # Build response items
    items = []
    for transaction, risk_decision in rows:
        items.append(
            TransactionListItem(
                id=str(transaction.id),
                amount=transaction.amount,
                currency=transaction.currency,
                customer_id=transaction.customer_id,
                payment_method=transaction.payment_method,
                created_at=transaction.created_at,
                decision=risk_decision.decision.value,
                fraud_score=float(risk_decision.fraud_score),
            )
        )

    return TransactionListResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
    )


@router.get(
    "/stats",
    response_model=TransactionStatsResponse,
    summary="Get transaction statistics",
    description=(
        "Retrieve transaction statistics for the authenticated merchant, "
        "including today's counts and a 7-day breakdown."
    ),
    status_code=status.HTTP_200_OK,
)
async def get_transaction_stats(
    current: dict = Depends(authenticated),
    db: AsyncSession = Depends(get_db),
) -> TransactionStatsResponse:
    merchant_id = uuid.UUID(current["merchant_id"])
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)

    # Today's statistics
    today_query = (
        select(Transaction, RiskDecision)
        .join(RiskDecision, Transaction.id == RiskDecision.transaction_id)
        .where(
            Transaction.merchant_id == merchant_id,
            Transaction.created_at >= today_start,
        )
    )
    today_result = await db.execute(today_query)
    today_rows = today_result.all()

    today_count = len(today_rows)
    blocked_count = sum(1 for _, rd in today_rows if rd.decision == DecisionEnum.BLOCK)
    flagged_count = sum(1 for _, rd in today_rows if rd.decision == DecisionEnum.FLAG)
    
    avg_fraud_score = 0.0
    if today_rows:
        total_fraud_score = sum(float(rd.fraud_score) for _, rd in today_rows)
        avg_fraud_score = total_fraud_score / today_count

    # Seven day breakdown
    seven_day_breakdown = []
    for days_ago in range(6, -1, -1):  # 6 days ago to today
        day_date = today - timedelta(days=days_ago)
        day_start = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = datetime.combine(day_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        day_query = (
            select(Transaction, RiskDecision)
            .join(RiskDecision, Transaction.id == RiskDecision.transaction_id)
            .where(
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= day_start,
                Transaction.created_at <= day_end,
            )
        )
        day_result = await db.execute(day_query)
        day_rows = day_result.all()

        day_count = len(day_rows)
        day_blocked = sum(1 for _, rd in day_rows if rd.decision == DecisionEnum.BLOCK)
        day_flagged = sum(1 for _, rd in day_rows if rd.decision == DecisionEnum.FLAG)

        seven_day_breakdown.append({
            "date": day_date.isoformat(),
            "count": day_count,
            "blocked": day_blocked,
            "flagged": day_flagged,
        })

    return TransactionStatsResponse(
        today_count=today_count,
        blocked_count=blocked_count,
        flagged_count=flagged_count,
        avg_fraud_score=round(avg_fraud_score, 4),
        seven_day_breakdown=seven_day_breakdown,
    )


@router.get(
    "/{transaction_id}",
    response_model=TransactionDetailResponse,
    summary="Get transaction details",
    description=(
        "Retrieve full details for a specific transaction. "
        "Merchants can only fetch their own transactions."
    ),
    status_code=status.HTTP_200_OK,
)
async def get_transaction_detail(
    transaction_id: str,
    current: dict = Depends(authenticated),
    db: AsyncSession = Depends(get_db),
) -> TransactionDetailResponse:
    merchant_id = uuid.UUID(current["merchant_id"])

    try:
        txn_uuid = uuid.UUID(transaction_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID format"
        )

    # Query transaction with risk decision
    query = (
        select(Transaction, RiskDecision)
        .join(RiskDecision, Transaction.id == RiskDecision.transaction_id)
        .where(
            Transaction.id == txn_uuid,
            Transaction.merchant_id == merchant_id,
        )
    )

    result = await db.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    transaction, risk_decision = row

    return TransactionDetailResponse(
        # Transaction fields
        id=str(transaction.id),
        merchant_id=str(transaction.merchant_id),
        amount=transaction.amount,
        currency=transaction.currency,
        customer_id=transaction.customer_id,
        payment_method=transaction.payment_method,
        device_id=transaction.device_id,
        ip_address=transaction.ip_address,
        merchant_category_code=transaction.merchant_category_code,
        is_international=transaction.is_international,
        metadata=transaction.metadata_,
        created_at=transaction.created_at,
        # RiskDecision fields
        decision=risk_decision.decision.value,
        fraud_score=float(risk_decision.fraud_score),
        return_risk_score=float(risk_decision.return_risk_score),
        chargeback_risk_score=float(risk_decision.chargeback_risk_score),
        model_version=risk_decision.model_version,
        feature_snapshot=risk_decision.feature_snapshot,
        llm_reason=risk_decision.llm_reason,
    )
