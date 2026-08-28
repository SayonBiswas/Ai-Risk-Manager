"""
Train all three ML models and save to app/ml/models/.
Run: python scripts/train_models.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pandas as pd
from app.ml.trainer import (
    load_data,
    train_fraud_detector,
    train_return_risk_scorer,
    train_chargeback_risk_scorer,
    save_models,
    FEATURE_COLUMNS,
)
from app.core.config import get_settings

settings = get_settings()

def main():
    print("Loading training data...")
    df = load_data("app/ml/data/sample_transactions.csv")
    print(f"Loaded {len(df)} rows")

    print("\nTraining Fraud Detector (XGBoost)...")
    fraud_model = train_fraud_detector(df)

    print("Training Return Risk Scorer (LightGBM)...")
    return_model = train_return_risk_scorer(df)

    print("Training Chargeback Risk Scorer (IsoForest + LR)...")
    cb_models = train_chargeback_risk_scorer(df)

    save_models(fraud_model, return_model, cb_models, settings.model_dir)
    print("\nAll models trained and saved.")

if __name__ == "__main__":
    main()