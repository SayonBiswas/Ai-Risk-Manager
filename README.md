# AI Risk Manager
### Razorpay Buildathon · Track 02 · AI-powered fraud, returns & chargeback protection

---

## What It Does

AI Risk Manager is a real-time transaction risk scoring platform built for merchants. It protects against three types of financial loss:

- **Fraud** — XGBoost classifier scores every transaction before it's approved
- **Return Risk** — LightGBM model predicts the probability a transaction will be returned
- **Chargebacks** — Isolation Forest + Logistic Regression flags chargeback risk, and Google Gemini generates AI dispute evidence packages automatically

---

## Architecture

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
  │  /v1/fraud    │ │/v1/chargeback│ │  /v1/returns     │
  │   detect      │ │   respond    │ │    score         │
  └───────┬───────┘ └──────┬───────┘ └────────┬─────────┘
          └────────────────┼──────────────────┘
                           ▼
              ┌────────────────────────┐
              │    RISK ENGINE CORE    │
              │  (Python ML Pipeline)  │
              └──────────┬─────────────┘
                         │
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
  │Fraud Detector│ │Return Scorer │ │ Chargeback Risk  │
  │  (XGBoost)   │ │ (LightGBM)   │ │ (IsoForest + LR) │
  └──────────────┘ └──────────────┘ └──────────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │  LLM Reasoner (Gemini)  │
              │  Evidence Generation    │
              └─────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| API Framework | FastAPI (Python 3.11) | Async REST API |
| Data Validation | Pydantic v2 | Request/response schemas |
| Database | PostgreSQL 15 + asyncpg (Neon) | Persistent storage |
| ORM | SQLAlchemy 2.0 async | DB access layer |
| Migrations | Alembic | Schema versioning |
| Cache / Rate Limit | Redis 7 + aioredis | Speed + throttling |
| ML — Fraud | XGBoost | Fraud classification |
| ML — Returns | LightGBM | Return risk scoring |
| ML — Chargebacks | Isolation Forest + LR | Anomaly detection |
| LLM | Google Gemini API | Reason + evidence generation |
| Auth | JWT + bcrypt | Security |
| Logging | structlog | JSON structured logs |
| Frontend | React 18 + Vite + Tailwind | Dashboard UI |
| Containerization | Docker | Dev & deployment |

---

## Quick Start (Local)

```bash
# 1. Clone and setup
git clone <your-repo>
cd ai-risk-manager
cp .env.example .env
# Fill in GEMINI_API_KEY and DATABASE_URL in .env

# 2. Start Redis (PostgreSQL is Neon cloud — no local instance needed)
docker-compose up -d redis

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run migrations
alembic upgrade head

# 5. Seed test data
python scripts/seed_db.py

# 6. Train ML models
python scripts/train_models.py

# 7. Start the API
uvicorn app.main:app --reload --port 8000

# 8. Start the frontend
cd ai-risk-manager-frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8000
npm run dev

# Open http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Liveness check |
| POST | `/auth/register` | None | Create account |
| POST | `/auth/login` | None | Login, get JWT |
| GET | `/auth/me` | Bearer JWT | Current user info |
| POST | `/api-keys/generate` | Bearer JWT | Generate API key |
| GET | `/api-keys` | Bearer JWT | View key status |
| POST | `/v1/fraud/detect` | X-API-Key | Full risk scoring |
| POST | `/v1/returns/score` | X-API-Key | Return risk only |
| POST | `/v1/chargebacks/respond` | X-API-Key | Generate dispute evidence |
| GET | `/v1/chargebacks/{id}/status` | X-API-Key | Dispute status |

---

## User Flow

```
1. Register → POST /auth/register → get JWT + initial API key
2. Login → POST /auth/login → get JWT
3. API Keys → POST /api-keys/generate → store key in browser
4. Dashboard → all risk calls use X-API-Key header
     ├── Fraud Detect → POST /v1/fraud/detect
     ├── Return Scorer → POST /v1/returns/score
     └── Chargebacks → POST /v1/chargebacks/respond
```

---

## Environment Variables

```bash
# Backend (.env)
PROJECT_NAME=AI Risk Manager
VERSION=1.0.0
DEBUG=false
DATABASE_URL=postgresql://user:pass@host/db   # Neon connection string
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=                                    # openssl rand -hex 32
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
GEMINI_API_KEY=                                # aistudio.google.com
GEMINI_MODEL=gemini-1.5-flash
MODEL_DIR=app/ml/models
MODEL_VERSION=1.0.0
ALLOWED_ORIGINS=http://localhost:5173

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000
```

---

## Deployment

**Backend → Render**
- Docker deploy, connect GitHub repo
- Add all env vars in Render dashboard
- Run `alembic upgrade head` in Render Shell after first deploy
- Free tier: 750 hrs/month (enough for one always-on service)

**Frontend → Vercel**
- Import repo, framework preset: Vite
- Set `VITE_API_BASE_URL` to your Render URL
- `vercel.json` handles SPA routing automatically

**Database → Neon PostgreSQL**
- Free serverless PostgreSQL, no local instance needed
- Just set `DATABASE_URL` in your env and run migrations

---

## Evaluation Metrics

Measured against a held-out test set of 10,000 transactions:

- Precision & Recall
- F1 Score
- ROC-AUC
- False Positive Rate
- False Positive Cost (₹ value of legitimate transactions incorrectly blocked)

---

## Important Rules

- `amount` must always be sent as a string `"1500.00"` not a number
- `payment_method` must be exactly one of `card` · `upi` · `netbanking` · `wallet`
- All `/v1/*` calls use `X-API-Key` header — not Bearer JWT
- Chargeback lookup requires the transaction was first sent through `/v1/fraud/detect` with `metadata: { transaction_id: "..." }` in the body
- Never commit `.env` to git

---

*AI Risk Manager · Razorpay Buildathon · Track 02*