"""
Tests for ML evaluator metrics.
"""

import numpy as np
import pytest
from unittest.mock import MagicMock

from app.ml.evaluator import evaluate


def make_mock_model(probs: list[float]):
    """Return a mock sklearn model with fixed predict_proba output."""
    model = MagicMock()
    model.predict_proba = MagicMock(
        return_value=np.column_stack([
            1 - np.array(probs),
            np.array(probs),
        ])
    )
    return model


class TestEvaluatorMetrics:

    def test_metrics_include_false_positive_cost(self):
        y_true   = np.array([0, 0, 1, 1, 0, 1])
        probs    = [0.8, 0.9, 0.8, 0.9, 0.1, 0.1]
        amounts  = np.array([100, 200, 300, 400, 150, 250])
        model    = make_mock_model(probs)
        metrics  = evaluate(model, np.zeros((6, 1)), y_true, amounts=amounts)
        assert "false_positive_cost" in metrics
        assert metrics["false_positive_cost"] >= 0.0

    def test_metrics_contain_all_required_keys(self):
        y_true  = np.array([0, 1, 0, 1])
        probs   = [0.1, 0.9, 0.2, 0.8]
        model   = make_mock_model(probs)
        metrics = evaluate(model, np.zeros((4, 1)), y_true)
        for key in ("precision", "recall", "f1", "roc_auc",
                    "false_positive_rate", "false_positive_cost", "confusion_matrix"):
            assert key in metrics

    def test_perfect_classifier_metrics(self):
        y_true  = np.array([0, 0, 1, 1])
        probs   = [0.05, 0.05, 0.95, 0.95]
        model   = make_mock_model(probs)
        metrics = evaluate(model, np.zeros((4, 1)), y_true)
        assert metrics["precision"] == 1.0
        assert metrics["recall"] == 1.0
        assert metrics["roc_auc"] == 1.0
        assert metrics["false_positive_rate"] == 0.0

    def test_false_positive_cost_counts_blocked_legit(self):
        # Model blocks txn 0 and 1 (probs 0.9) — both are legit (y=0)
        y_true  = np.array([0, 0, 1, 1])
        probs   = [0.9, 0.9, 0.9, 0.9]
        amounts = np.array([500.0, 300.0, 200.0, 100.0])
        model   = make_mock_model(probs)
        metrics = evaluate(model, np.zeros((4, 1)), y_true, amounts=amounts)
        # FP cost = amounts where y=0 and pred=1 → 500 + 300 = 800
        assert abs(metrics["false_positive_cost"] - 800.0) < 1.0

    def test_precision_recall_above_threshold_with_good_model(self):
        # Simulate a reasonably good model
        np.random.seed(42)
        n = 200
        y_true = np.random.binomial(1, 0.1, n)
        # Good model: high prob for positives, low for negatives
        probs = np.where(y_true == 1,
                         np.random.uniform(0.7, 1.0, n),
                         np.random.uniform(0.0, 0.3, n))
        model   = make_mock_model(probs.tolist())
        metrics = evaluate(model, np.zeros((n, 1)), y_true, threshold=0.5)
        assert metrics["precision"] >= 0.70
        assert metrics["recall"] >= 0.70

    def test_confusion_matrix_shape(self):
        y_true  = np.array([0, 1, 0, 1, 1])
        probs   = [0.1, 0.9, 0.8, 0.9, 0.2]
        model   = make_mock_model(probs)
        metrics = evaluate(model, np.zeros((5, 1)), y_true)
        cm = metrics["confusion_matrix"]
        assert all(k in cm for k in ("tn", "fp", "fn", "tp"))
        assert cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"] == 5