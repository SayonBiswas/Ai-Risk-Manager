"""
Evaluate all models on the held-out test set.
Run: python scripts/evaluate_models.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import joblib
import numpy as np
import pandas as pd

from app.ml.trainer import FEATURE_COLUMNS
from app.ml.evaluator import evaluate, save_metrics
from app.core.config import get_settings

settings = get_settings()

def main():
    df = pd.read_csv("app/ml/data/held_out_test_set.csv")
    X  = df[FEATURE_COLUMNS].values
    amounts = df["amount"].values

    fraud_model  = joblib.load(f"{settings.model_dir}/fraud_model.joblib")
    return_model = joblib.load(f"{settings.model_dir}/return_model.joblib")
    cb_models    = joblib.load(f"{settings.model_dir}/cb_model.joblib")

    metrics = {}

    metrics["fraud"] = evaluate(
        fraud_model, X, df["is_fraud"].values,
        amounts=amounts, model_name="Fraud Detector"
    )
    metrics["returns"] = evaluate(
        return_model, X, df["was_returned"].values,
        amounts=amounts, model_name="Return Risk Scorer"
    )
    metrics["chargebacks"] = evaluate(
        cb_models["logistic_regression"], X, df["had_chargeback"].values,
        amounts=amounts, model_name="Chargeback Risk Scorer"
    )

    save_metrics(metrics)

if __name__ == "__main__":
    main()