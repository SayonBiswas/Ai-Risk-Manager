"""
Standalone RiskScore and Decision dataclasses used internally
between services (not exposed directly as API schemas).
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class RiskScores:
    fraud_score: float           # 0.0 – 1.0
    return_risk_score: float     # 0.0 – 1.0
    chargeback_risk_score: float # 0.0 – 1.0


@dataclass
class RiskDecisionResult:
    decision: Literal["ALLOW", "FLAG", "BLOCK"]
    scores: RiskScores
    reason: str
    recommended_actions: list[str] = field(default_factory=list)

    @classmethod
    def from_scores(cls, scores: RiskScores, reason: str = "") -> "RiskDecisionResult":
        """
        Apply decision rules:
          fraud_score > 0.8                        → BLOCK
          fraud_score > 0.5 OR cb_score > 0.7     → FLAG
          else                                     → ALLOW
        """
        if scores.fraud_score > 0.8:
            decision = "BLOCK"
            actions = [
                "Block this transaction immediately",
                "Notify merchant risk team",
                "Flag customer account for review",
            ]
        elif scores.fraud_score > 0.5 or scores.chargeback_risk_score > 0.7:
            decision = "FLAG"
            actions = [
                "Hold transaction for manual review",
                "Request additional customer verification",
                "Monitor customer activity for 24 hours",
            ]
        else:
            decision = "ALLOW"
            actions = ["Transaction approved — no action required"]

        return cls(decision=decision, scores=scores, reason=reason, recommended_actions=actions)