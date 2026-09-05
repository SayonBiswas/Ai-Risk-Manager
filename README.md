# AI Risk Manager
### Stop merchants losing money to fraud, returns, and chargebacks
> Razorpay Buildathon · Track 02 · AI-powered payment risk detection

---

## What It Does

AI Risk Manager is a full-stack payment risk platform that analyses transactions in real-time across three dimensions:

- **Fraud Detection** — XGBoost ML model scores every transaction 0–100. High-risk transactions are blocked or flagged with an AI-generated explanation.
- **Return Risk Scoring** — LightGBM model predicts the probability a transaction will be returned, with recommended merchant actions.
- **Chargeback Response** — Gemini AI drafts a complete dispute evidence package when a chargeback is filed, including document checklist and recommended bank response.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI RISK MANAGER                         │
└─────────────────────────────────────────────────────────────┘

  React Frontend (Vite)
       │  HTTPS
       ▼
  FastAPI Backend
  ├── /auth/*          JWT auth (register, login)
  ├── /api-keys/*      API key management
  ├── /v1/fraud/detect        ← XGBoost + Gemini reason
  ├── /v1/returns/score       ← LightGBM scoring
  └── /v1/chargebacks/respond ← Gemini evidence package
       │
  ┌────┴────┐
  │         │
 Neon      Redis
 PostgreSQL (cache + rate limit)
```

**Decision rules:**
- `fraud_score > 0.80` → **BLOCK**
- `fraud_score > 0.50` or `chargeback_risk > 0.70` → **FLAG** (LLM reason generated)
- Otherwise → **ALLOW**

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI (Python 3.12) + uvicorn |
| Data Validation | Pydantic v2 (strict=False for JSON coercion) |
| Database | PostgreSQL 15 via Neon (async + asyncpg) |
| ORM | SQLAlchemy 2.0 async |
| Migrations | Alembic |
| Cache / Rate Limit | Redis 7 (optional — app degrades gracefully without it) |
| ML — Fraud | XGBoost classifier |
| ML — Returns | LightGBM classifier |
| ML — Chargebacks | Isolation Forest + Logistic Regression ensemble |
| Feature Engineering | Pandas, NumPy, scikit-learn |
| LLM | Google Gemini API (gemini-2.0-flash) |
| Auth | JWT (python-jose) + bcrypt + SHA-256 API keys |
| HTTP Client | httpx (async) |
| Logging | structlog (JSON) |
| Frontend | React 18 + Vite 5 + Tailwind CSS |
| Frontend Routing | React Router v6 |
| Charts | Recharts |
| Icons | Lucide React |

---

## Project Structure

```
ai-risk-manager/
├── app/
│   ├── main.py                    # FastAPI app, CORS, lifecycle
│   ├── api/v1/
│   │   ├── fraud.py               # POST /v1/fraud/detect
│   │   ├── returns.py             # POST /v1/returns/score
│   │   ├── chargebacks.py         # POST /v1/chargebacks/respond
│   │   ├── auth.py                # POST /auth/register, /auth/login
│   │   ├── api_keys.py            # GET/POST/DELETE /api-keys
│   │   └── health.py              # GET /health
│   ├── core/
│   │   ├── config.py              # Pydantic settings from .env
│   │   ├── security.py            # JWT + API key crypto
│   │   ├── rate_limiter.py        # Redis sliding window (100 req/min)
│   │   └── logging.py             # structlog JSON logging
│   ├── db/
│   │   ├── models.py              # SQLAlchemy ORM models
│   │   ├── session.py             # AsyncSession + get_db()
│   │   └── migrations/            # Alembic migrations
│   ├── middleware/
│   │   ├── auth.py                # X-API-Key OR Bearer JWT
│   │   └── audit_logger.py        # Request/response audit trail
│   ├── models/
│   │   └── transaction.py         # Pydantic schemas (all endpoints)
│   ├── services/
│   │   ├── feature_extractor.py   # 12-feature ML pipeline
│   │   ├── fraud_detector.py      # ML model loader + predict()
│   │   ├── llm_reasoner.py        # Gemini API integration
│   │   └── webhook_dispatcher.py  # HMAC-signed outbound webhooks
│   └── ml/
│       ├── trainer.py             # Model training script
│       ├── evaluator.py           # Precision/recall/ROC-AUC metrics
│       └── models/
│           ├── fraud_model.joblib  # XGBoost (843 KB)
│           ├── return_model.joblib # LightGBM (994 KB)
│           └── cb_model.joblib     # IsoForest+LR ensemble (3.1 MB)
│
└── ai-risk-manager-frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Register.jsx
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── FraudDetect.jsx
    │   │   ├── ReturnScorer.jsx
    │   │   ├── ChargebackResponder.jsx
    │   │   └── ApiKeys.jsx
    │   ├── api/
    │   │   ├── client.js          # axios instance + 401 interceptor
    │   │   ├── auth.js            # register / login / me
    │   │   └── risk.js            # detectFraud / scoreReturn / respond
    │   └── context/
    │       └── AuthContext.jsx    # JWT + API key state
    └── vite.config.js
```

---

## Quick Start (Local)

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL (or a [Neon](https://neon.tech) free account)
- Redis (optional — see below)

### 1. Clone and configure

```bash
git clone https://github.com/SayonBiswas/Ai-Risk-Manager.git
cd Ai-Risk-Manager
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PROJECT_NAME=AI Risk Manager
VERSION=1.0.0
DEBUG=true
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Neon PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# Redis (optional — app works without it)
REDIS_URL=redis://localhost:6379

# Auth
SECRET_KEY=your-32-char-random-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### 2. Backend setup

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run DB migrations
alembic upgrade head

# Train ML models (generates .joblib files)
python scripts/train_models.py

# Start backend
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd ai-risk-manager-frontend
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8000

npm install
npm run dev
# Open http://localhost:3000
```

### 4. Redis (optional)

```bash
# Docker (easiest)
docker run -d -p 6379:6379 redis:7

# Or Ubuntu/Debian
sudo apt install redis-server -y && sudo systemctl start redis
```

Without Redis, the app starts normally — LLM responses aren't cached and rate limiting is disabled. Fully functional for demo purposes.

---

## API Reference

All `/v1/*` endpoints require `X-API-Key` header. Auth endpoints use `Authorization: Bearer <jwt>`.

### POST /v1/fraud/detect

```json
{
  "transaction_id": "TXN-001",
  "amount": "1500.00",
  "currency": "INR",
  "customer_id": "CUST-001",
  "payment_method": "card",
  "device_id": "DEV-001",
  "ip_address": "203.0.113.1",
  "merchant_category_code": "5411",
  "is_international": false,
  "metadata": {}
}
```

Response:
```json
{
  "transaction_id": "TXN-001",
  "decision": "ALLOW",
  "fraud_score": 0.12,
  "return_risk_score": 0.05,
  "chargeback_risk_score": 0.08,
  "reason": "Transaction approved — all risk signals within acceptable thresholds.",
  "recommended_actions": ["No additional action required"],
  "model_version": "1.0.0",
  "latency_ms": 143
}
```

### POST /v1/returns/score

Same request body as fraud detect. Response:
```json
{
  "transaction_id": "TXN-001",
  "return_risk_score": 0.35,
  "risk_band": "MEDIUM",
  "recommended_actions": ["Apply standard return window policy"],
  "model_version": "1.0.0",
  "latency_ms": 88
}
```

### POST /v1/chargebacks/respond

> The transaction must have been previously processed through `/v1/fraud/detect` first.

```json
{
  "transaction_id": "TXN-001",
  "chargeback_reason_code": "4853",
  "amount": "1500.00",
  "dispute_deadline": "2026-09-30"
}
```

Response:
```json
{
  "transaction_id": "TXN-001",
  "evidence_summary": "Transaction was authorized on 2026-08-01 with full device and IP verification...",
  "confidence": 0.87,
  "evidence_documents": ["Transaction receipt", "Device fingerprint log", "Customer order history"],
  "recommended_response": "Submit transaction receipt and device confirmation to acquiring bank..."
}
```

---

## Sample Test Data

### ALLOW (low risk)
| Field | Value |
|---|---|
| Transaction ID | `TXN-ALLOW-001` |
| Amount | `299` |
| Currency | `INR` |
| Customer ID | `CUST-REGULAR-42` |
| Payment Method | `upi` |
| IP Address | `192.168.1.10` |
| MCC Code | `5411` |
| Device ID | `DEV-KNOWN-ABC` |
| International | No |

### FLAG (medium risk)
| Field | Value |
|---|---|
| Transaction ID | `TXN-FLAG-001` |
| Amount | `45000` |
| Currency | `INR` |
| Customer ID | `CUST-MEDIUM-10` |
| Payment Method | `card` |
| IP Address | `203.0.113.42` |
| MCC Code | `5816` |
| Device ID | *(leave blank)* |
| International | Yes |

### BLOCK (high risk)
| Field | Value |
|---|---|
| Transaction ID | `TXN-BLOCK-001` |
| Amount | `250000` |
| Currency | `INR` |
| Customer ID | `CUST-SUSPECT-99` |
| Payment Method | `card` |
| IP Address | `198.51.100.77` |
| MCC Code | `7273` |
| Device ID | *(leave blank)* |
| International | Yes |

### Chargeback (use TXN-FLAG-001 after running fraud detect on it)
| Field | Value |
|---|---|
| Transaction ID | `TXN-FLAG-001` |
| Amount | `45000` |
| Reason Code | `4853` |
| Dispute Deadline | `2026-10-30` |

---

## Security Architecture

```
Layer 1 — Transport:     HTTPS only (TLS 1.2+)
Layer 2 — Auth:          API Key (X-API-Key) for ML endpoints
                         JWT Bearer for dashboard endpoints
Layer 3 — Rate Limiting: 100 req/min per API key (Redis sliding window)
Layer 4 — Validation:    Pydantic v2 strict schemas on all inputs
Layer 5 — Audit Trail:   Every request logged with payload hash
Layer 6 — Secrets:       All credentials via .env, never committed
```

---

## ML Model Performance

Models trained on synthetic transaction dataset (50,000 samples, stratified split):

| Model | Algorithm | Precision | Recall | ROC-AUC |
|---|---|---|---|---|
| Fraud Detector | XGBoost | ~0.91 | ~0.76 | ~0.94 |
| Return Risk Scorer | LightGBM | ~0.88 | ~0.72 | ~0.91 |
| Chargeback Risk | IsoForest + LR | ~0.84 | ~0.69 | ~0.88 |

Run full evaluation:
```bash
python scripts/evaluate_models.py
# Outputs metrics.json + confusion matrices
```

---

## Known Issues & Fixes Applied

| Issue | Fix |
|---|---|
| `strict=True` caused 422 on all JSON inputs (`date`, `Decimal`) | Changed to `strict=False` + explicit field validators |
| Chargeback endpoint called wrong URL (`/v1/fraud/detect`) | Fixed URL in `ChargebackResponder.jsx` |
| `scalar_one_or_none()` crashed when same TXN submitted multiple times | Added `.order_by(created_at.desc()).limit(1)` |
| 401 interceptor logged user out on any API error | Interceptor now only redirects on `/auth/` endpoint failures |
| Gemini `gemini-1.5-flash` model deprecated (June 2026) | Updated to `gemini-2.0-flash` |
| Redis connection crashed app startup when Redis not running | Wrapped in try/except, sets `app.state.redis = None` gracefully |
| Frontend not sending `X-API-Key` on risk API calls | Added header to all three page `handleSubmit` functions |

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com), connect your GitHub repo
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `.env` in the Render dashboard
5. Run migrations via Render Shell: `alembic upgrade head`
6. Verify: `GET https://your-app.onrender.com/health` → `{"status":"ok"}`

### Frontend → Vercel

1. Import the `ai-risk-manager-frontend` folder to [Vercel](https://vercel.com)
2. Set environment variable: `VITE_API_BASE_URL=https://your-app.onrender.com`
3. Add `vercel.json` for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
4. After deploy, update `ALLOWED_ORIGINS` on Render to include your Vercel URL and redeploy

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (asyncpg format) |
| `SECRET_KEY` | Yes | 32+ char random string for JWT signing |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_MODEL` | No | Default: `gemini-2.0-flash` |
| `REDIS_URL` | No | Redis URL — app works without it |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of frontend URLs |
| `JWT_ALGORITHM` | No | Default: `HS256` |
| `JWT_EXPIRE_MINUTES` | No | Default: `1440` (24 hours) |
| `DEBUG` | No | Default: `false` |
| `PORT` | No | Default: `8000` |

---

## Contributing

This project was built for the **Razorpay Buildathon — Track 02** (Defense-only · No offense-capable features).

```bash
# Run tests
pytest tests/ -v --cov=app --cov-report=html

# Format code
black app/ && isort app/

# Type check
mypy app/
```

---

*AI Risk Manager · Razorpay Buildathon · Track 02 · Defense-only*