"""
ML model training pipeline.
Trains FraudDetector, ReturnRiskScorer, ChargebackRiskScorer.
Run: python scripts/train_models.py
"""

import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

import xgboost as xgb
import lightgbm as lgb

from app.core.config import get_settings

settings = get_settings()

FEATURE_COLUMNS = [
    "amount_log",
    "amount_zscore",
    "hour_of_day",
    "is_weekend",
    "velocity_1h",
    "velocity_24h",
    "amount_velocity_ratio",
    "is_international",
    "payment_method_encoded",
    "merchant_category_risk",
    "ip_country_mismatch",
    "device_seen_before",
]


def load_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0
    return df


def train_fraud_detector(df: pd.DataFrame) -> xgb.XGBClassifier:
    """
    XGBoost fraud classifier.
    scale_pos_weight handles class imbalance (fraud << legit).
    Threshold tuned toward minimising false positives.
    """
    X = df[FEATURE_COLUMNS].values
    y = df["is_fraud"].values

    neg = (y == 0).sum()
    pos = (y == 1).sum()
    scale_pos_weight = neg / pos if pos > 0 else 1.0

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        use_label_encoder=False,
        eval_metric="aucpr",       # precision-recall AUC — better for imbalanced
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)
    return model


def train_return_risk_scorer(df: pd.DataFrame) -> lgb.LGBMClassifier:
    """
    LightGBM return-risk classifier.
    """
    X = df[FEATURE_COLUMNS].values
    y = df["was_returned"].values

    neg = (y == 0).sum()
    pos = (y == 1).sum()

    model = lgb.LGBMClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        is_unbalance=True,
        class_weight={0: 1, 1: neg / pos if pos > 0 else 1},
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    model.fit(X, y)
    return model


def train_chargeback_risk_scorer(df: pd.DataFrame) -> dict:
    """
    Ensemble: IsolationForest (anomaly) + Logistic Regression.
    Returns a dict with both models; scoring averages their outputs.
    """
    X = df[FEATURE_COLUMNS].values
    y = df["had_chargeback"].values

    # IsolationForest — contamination = estimated fraud rate
    contamination = float(y.mean()) if y.mean() > 0 else 0.05
    iso = IsolationForest(
        n_estimators=200,
        contamination=min(contamination, 0.5),
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X)

    # Logistic Regression on scaled features
    lr_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=42,
        )),
    ])
    lr_pipeline.fit(X, y)

    return {"isolation_forest": iso, "logistic_regression": lr_pipeline}


def save_models(
    fraud_model,
    return_model,
    cb_models: dict,
    model_dir: str,
) -> None:
    Path(model_dir).mkdir(parents=True, exist_ok=True)
    joblib.dump(fraud_model,             f"{model_dir}/fraud_model.joblib")
    joblib.dump(return_model,            f"{model_dir}/return_model.joblib")
    joblib.dump(cb_models,               f"{model_dir}/cb_model.joblib")
    print(f"Models saved to {model_dir}/")