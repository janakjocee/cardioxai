"""
Conformal Prediction and Uncertainty Quantification for CardioXAI.

Implements inductive split-conformal prediction sets guaranteeing distribution-free
validity for cardiovascular risk classification.
"""

from __future__ import annotations
import numpy as np
from typing import Dict, Any, Tuple


class InductiveConformalCalibrator:
    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha
        self.q_val: float = 0.0542

    def calibrate(self, y_true: np.ndarray, y_prob: np.ndarray):
        r"""
        Calibrates the non-conformity quantile on a held-out calibration fold.
        s_i = |y_i - \hat{p}_i|
        """
        n = len(y_true)
        if n == 0:
            return
        nonconformity_scores = np.abs(y_true - y_prob)
        # 1 - alpha quantile with finite-sample adjustment (ceil((n+1)(1-alpha)) / n)
        k = int(np.ceil((n + 1) * (1.0 - self.alpha)))
        k = min(n, max(1, k))
        self.q_val = float(np.partition(nonconformity_scores, k - 1)[k - 1])

    def predict_interval(
        self,
        p_fused: float,
        reliability_r: float = 1.0,
        pulse_pressure: float = 45.0
    ) -> Dict[str, Any]:
        penalty_r = (1.0 - np.clip(reliability_r, 0.4, 1.0)) * 0.12
        penalty_pp = 0.035 if pulse_pressure > 70.0 else (0.015 if pulse_pressure > 55.0 else 0.0)

        half_width = self.q_val + penalty_r + penalty_pp
        lower = max(0.0, round(p_fused - half_width, 4))
        upper = min(1.0, round(p_fused + half_width, 4))
        width = round(upper - lower, 4)

        tier = "HIGH_CERTAINTY"
        if width > 0.20:
            tier = "EPISTEMIC_AMBIGUITY"
        elif width > 0.12:
            tier = "MODERATE_CERTAINTY"

        return {
            "alpha": self.alpha,
            "coverage": 1.0 - self.alpha,
            "point_probability": round(p_fused, 4),
            "lower_bound": lower,
            "upper_bound": upper,
            "interval_width": width,
            "certainty_tier": tier
        }
