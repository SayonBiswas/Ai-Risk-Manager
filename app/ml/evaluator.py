"""
Model evaluation — precision, recall, F1, ROC-AUC, false positive cost.
Run: python scripts/evaluate_models.py
"""

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate(
    model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    amounts: np.ndarray | None = None,
    model_name: str = "model",
    threshold: float = 0.5,
) -> dict:
    """
    Evaluate a binary classifier and return a metrics dict.

    Args:
        model:      Fitted sklearn-compatible model with predict_proba().
        X_test:     Feature matrix.
        y_test:     True labels (0/1).
        amounts:    Transaction amounts — used to compute false_positive_cost.
        model_name: Label for printing.
        threshold:  Decision threshold (default 0.5).

    Returns:
        dict with precision, recall, f1, roc_auc, false_positive_rate,
        false_positive_cost, confusion_matrix.
    """
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_test)[:, 1]
    else:
        # IsolationForest returns anomaly scores — convert to 0-1
        raw = model.score_samples(X_test)
        y_prob = 1 - (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)

    y_pred = (y_prob >= threshold).astype(int)

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    # False positive cost = sum of amounts where model blocked a legit txn
    fp_cost = 0.0
    if amounts is not None:
        fp_mask = (y_pred == 1) & (y_test == 0)
        fp_cost = float(amounts[fp_mask].sum())

    try:
        auc = roc_auc_score(y_test, y_prob)
    except ValueError:
        auc = 0.0

    metrics = {
        "model": model_name,
        "threshold": threshold,
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(auc), 4),
        "false_positive_rate": round(float(fpr), 4),
        "false_positive_cost": round(fp_cost, 2),
        "confusion_matrix": {
            "tn": int(tn), "fp": int(fp),
            "fn": int(fn), "tp": int(tp),
        },
    }

    _print_metrics(metrics)
    return metrics


def save_metrics(metrics: dict, path: str = "metrics.json") -> None:
    with open(path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {path}")


def _print_metrics(m: dict) -> None:
    print(f"\n{'─' * 50}")
    print(f"  {m['model']}")
    print(f"{'─' * 50}")
    print(f"  Precision:           {m['precision']:.4f}")
    print(f"  Recall:              {m['recall']:.4f}")
    print(f"  F1 Score:            {m['f1']:.4f}")
    print(f"  ROC-AUC:             {m['roc_auc']:.4f}")
    print(f"  False Positive Rate: {m['false_positive_rate']:.4f}")
    print(f"  False Positive Cost: ₹{m['false_positive_cost']:,.2f}")
    cm = m["confusion_matrix"]
    print(f"\n  Confusion Matrix:")
    print(f"    TN={cm['tn']}  FP={cm['fp']}")
    print(f"    FN={cm['fn']}  TP={cm['tp']}")
    print(f"{'─' * 50}\n")