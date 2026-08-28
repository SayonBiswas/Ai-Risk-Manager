# scripts/generate_sample_data.py
# Run: python scripts/generate_sample_data.py
# Generates app/ml/data/sample_transactions.csv (10,000 rows)

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
N = 10_000

df = pd.DataFrame({
    "amount_log":              np.random.exponential(scale=2.0, size=N),
    "amount_zscore":           np.random.normal(0, 1, N),
    "hour_of_day":             np.random.randint(0, 24, N).astype(float),
    "is_weekend":              np.random.binomial(1, 0.28, N).astype(float),
    "velocity_1h":             np.random.poisson(1.5, N).astype(float),
    "velocity_24h":            np.random.poisson(5, N).astype(float),
    "amount_velocity_ratio":   np.random.lognormal(0, 0.5, N),
    "is_international":        np.random.binomial(1, 0.15, N).astype(float),
    "payment_method_encoded":  np.random.choice([0.1, 0.2, 0.3, 0.6], N),
    "merchant_category_risk":  np.random.uniform(0.1, 0.9, N),
    "ip_country_mismatch":     np.random.binomial(1, 0.15, N).astype(float),
    "device_seen_before":      np.random.binomial(1, 0.7, N).astype(float),
    "amount":                  np.random.exponential(scale=1000, size=N),
})

# Labels — correlated with features for realistic model training
fraud_prob = (
    0.3 * (df["velocity_1h"] > 3).astype(float)
    + 0.25 * df["is_international"]
    + 0.2 * df["merchant_category_risk"]
    + 0.15 * (df["amount_zscore"] > 2).astype(float)
    + 0.1 * (1 - df["device_seen_before"])
)
fraud_prob = np.clip(fraud_prob / fraud_prob.max() * 0.15, 0, 1)  # ~5% fraud rate

df["is_fraud"]       = np.random.binomial(1, fraud_prob)
df["was_returned"]   = np.random.binomial(1, np.clip(fraud_prob * 2, 0, 0.25))
df["had_chargeback"] = np.random.binomial(1, np.clip(fraud_prob * 1.5, 0, 0.15))

Path("app/ml/data").mkdir(parents=True, exist_ok=True)
df.to_csv("app/ml/data/sample_transactions.csv", index=False)

# 80/20 split for held-out test set
test = df.sample(frac=0.2, random_state=42)
train = df.drop(test.index)
train.to_csv("app/ml/data/sample_transactions.csv", index=False)
test.to_csv("app/ml/data/held_out_test_set.csv", index=False)

print(f"Train: {len(train)} rows | Test: {len(test)} rows")
print(f"Fraud rate: {df['is_fraud'].mean():.2%}")