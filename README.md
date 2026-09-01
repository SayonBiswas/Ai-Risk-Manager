# AI Risk Manager — Razorpay Buildathon Track 02
### Stop the merchant losing money to fraud, returns and chargebacks

*Track 02 · Razorpay /buildathon · Defense-only · No offense-capable features*

---

## 📐 Project Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI RISK MANAGER SYSTEM                           │
│                   (Fraud · Returns · Chargebacks)                       │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   Merchant   │
                         │  (API Client)│
                         └──────┬───────┘
                                │ HTTPS Request
                                ▼
              ┌─────────────────────────────────┐
              │         API GATEWAY             │
              │  FastAPI + JWT Auth Middleware  │
              │  Rate Limiting · API Key Auth   │
              └────────────┬────────────────────┘
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
  ┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
  │  /v1/fraud    │ │ /v1/chargeback│ │  /v1/returns     │
  │   detect      │ │   respond    │ │    score         │
  │               │ │   /status    │ │                   │
  └───────┬───────┘ └──────┬───────┘ └────────┬─────────┘
          │                │                  │
          └────────────────┼──────────────────┘
                           ▼
              ┌────────────────────────┐
              │    RISK ENGINE CORE    │
              │  (Python ML Pipeline)  │
              └──────────┬─────────────┘
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
  ┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
  │ Fraud Detector│ │ Return Scorer│ │ Chargeback Risk  │
  │   (XGBoost)   │ │  (LightGBM)  │ │  (IsoForest+LR)  │
  └───────────────┘ └──────────────┘ └──────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   LLM Reasoner (Gemini) │
              │   Evidence Generation   │
              └────────────────────────┘
```

---

## 🧰 Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| API Framework | FastAPI (Python 3.11) | Async REST API |
| Data Validation | Pydantic v2 | Request/response schemas |
| Database | PostgreSQL 15 + asyncpg | Persistent storage |
| ORM | SQLAlchemy 2.0 (async) | DB access layer |
| Migrations | Alembic | Schema versioning |
| Cache / Rate Limit | Redis 7 + aioredis | Speed + throttling |
| ML — Fraud | XGBoost | Fraud classification |
| ML — Returns | LightGBM | Return risk scoring |
| ML — Chargebacks | Isolation Forest + LR | Anomaly + scoring |
| Data Processing | Pandas, NumPy, scikit-learn | Feature engineering |
| LLM | Anthropic Claude API | Reason generation |
| HTTP Client | httpx (async) | External API calls |
| Auth | JWT (python-jose) + bcrypt | Security |
| Logging | structlog | JSON structured logs |
| Containerization | Docker + Docker Compose | Dev & deployment |
| Testing | pytest + pytest-asyncio + respx | Test suite |[cite: 1]

---

## ⚡ Quick Start

```bash
# 1. Clone and setup
git clone <your-repo>
cd ai-risk-manager
cp .env.example .env
# Fill in your ANTHROPIC_API_KEY and DB credentials in .env

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run migrations
alembic upgrade head

# 5. Seed test data
python scripts/seed_db.py

# 6. Train ML models
python scripts/train_models.py

# 7. Evaluate models (check precision/recall)
python scripts/evaluate_models.py

# 8. Start the API
uvicorn app.main:app --reload --port 8000

# 9. Run tests
pytest tests/ -v --cov=app --cov-report=html

# 10. View API docs
open http://localhost:8000/docs
```[cite: 1]

---

## 📊 Evaluation Metrics

The system will report on the following metrics against a held-out test set of 10,000 transactions[cite: 1]:
*   **Precision & Recall**[cite: 1]
*   **F1 Score**[cite: 1]
*   **ROC-AUC**[cite: 1]
*   **False Positive Rate**[cite: 1]
*   **False Positive Cost:** Total ₹ value of legitimate revenue incorrectly blocked by the model[cite: 1].