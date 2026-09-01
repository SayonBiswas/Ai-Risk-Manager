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
              ┌─────────────────────────┐
              │   LLM Reasoner (Gemini)  │
              │   Evidence Generation    │
              └─────────────────────────┘
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
| LLM | Google Gemini API | Reason generation |
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
# Fill in your GEMINI_API_KEY and DB credentials in .env

# 2. Start infrastructure (Redis only - PostgreSQL is Neon cloud)
docker-compose up -d redis

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
```

---

## 🗄️ Database Setup (Neon PostgreSQL)

This project uses **Neon PostgreSQL** as the cloud database. Here's how to set it up:

### Getting Your Neon Connection String

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your connection string from the Neon dashboard
4. Add your password to the connection string

### Configuring the Application

Add your Neon connection string to your `.env` file:

```bash
# Neon Database Connection
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Benefits of Using Neon

- **Serverless**: Auto-scaling PostgreSQL
- **Free tier**: Generous free tier for development
- **Branching**: Database branching for development/testing
- **Connection pooling**: Built-in connection pooling
- **Global**: Low latency with global deployment

### Running Migrations with Neon

The application is configured to work seamlessly with Neon. Just run:

```bash
alembic upgrade head
```

The migrations will be applied directly to your Neon database.

---

## 🚀 Deployment

### Backend (Render with Neon Database)

1. **Set up Neon Database:**
   - Create a free account at [neon.tech](https://neon.tech)
   - Create a new PostgreSQL project
   - Copy your connection string (format: `postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

2. **Configure Render:**
   - Create a new account on [render.com](https://render.com)
   - Connect your GitHub repository
   - Create a new Web Service using the `render.yaml` configuration
   - Set the required environment variables in the Render dashboard:
     - `DATABASE_URL` (your Neon connection string with password)
     - `GEMINI_API_KEY` (get from [Google AI Studio](https://aistudio.google.com/app/apikey))
     - `SECRET_KEY` (generate with `openssl rand -hex 32`)
     - `ALLOWED_ORIGINS` (set to your Vercel frontend URL)
   - The `render.yaml` will automatically create a Redis instance for caching
3. Deploy and wait for the build to complete

### Frontend (Vercel)

1. Create a new account on [vercel.com](https://vercel.com)
2. Import the `frontend/` directory
3. Set the `VITE_API_URL` environment variable to your Render backend URL
4. Deploy

### Local Testing with Frontend

```bash
# Terminal 1: Start Redis (Neon DB is cloud-hosted)
docker-compose up -d redis

# Terminal 2: Start backend
cd ai-risk-manager
uvicorn app.main:app --reload --port 8000

# Terminal 3: Start frontend
cd frontend
npm run dev
```

Open http://localhost:5173 to test the UI.

**Note:** Since we're using Neon PostgreSQL (cloud database), you don't need to run a local PostgreSQL instance. Just ensure your `.env` file has the correct `DATABASE_URL` with your Neon password.

---[cite: 1]

---

## 📊 Evaluation Metrics

The system will report on the following metrics against a held-out test set of 10,000 transactions[cite: 1]:
*   **Precision & Recall**[cite: 1]
*   **F1 Score**[cite: 1]
*   **ROC-AUC**[cite: 1]
*   **False Positive Rate**[cite: 1]
*   **False Positive Cost:** Total ₹ value of legitimate revenue incorrectly blocked by the model[cite: 1].