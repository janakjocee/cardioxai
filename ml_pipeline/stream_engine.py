"""
Real-Time Telemetry and Streaming Inference Engine for CardioXAI.

Provides continuous hemodynamic stream processing, sliding window calculations,
sensor reliability decay detection, and real-time Late-Fusion risk inference.
"""

from __future__ import annotations
import math
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Generator

# Pre-calibrated empirical parameters from authentic 70k Kaggle CVD cohort
SCALER_MEAN = [0.4921, 0.4924, 1.0, 0.4924, -0.0003]
SCALER_SCALE = [0.2619, 0.1477, 0.0011, 0.1477, 0.2299]
META_WEIGHTS = [0.6048, 0.1973, -0.0539, 0.1971, 0.5622]
META_INTERCEPT = -0.0163


class RealTimeTelemetryEngine:
    def __init__(
        self,
        patient_age: float = 56.0,
        patient_gender: int = 2,
        patient_height: float = 172.0,
        patient_weight: float = 82.0,
        patient_chol: int = 2,
        patient_gluc: int = 1
    ):
        self.age = patient_age
        self.gender = patient_gender
        self.height = patient_height
        self.weight = patient_weight
        self.chol = patient_chol
        self.gluc = patient_gluc

        self.sbp_buffer: List[float] = []
        self.dbp_buffer: List[float] = []
        self.tick_count = 0

    def compute_instantaneous_risk(
        self,
        sbp: float,
        dbp: float,
        hr: float,
        smoke: int = 0,
        active: int = 0,
        sensor_quality: float = 1.0
    ) -> Dict[str, Any]:
        self.tick_count += 1
        now_iso = datetime.now(timezone.utc).isoformat()

        # Moving hemodynamics
        pp = sbp - dbp
        map_val = round(dbp + (pp / 3.0), 1)
        rpp = round((hr * sbp) / 100.0, 1)

        self.sbp_buffer.append(sbp)
        self.dbp_buffer.append(dbp)
        if len(self.sbp_buffer) > 5:
            self.sbp_buffer.pop(0)
        if len(self.dbp_buffer) > 5:
            self.dbp_buffer.pop(0)

        moving_sbp = round(sum(self.sbp_buffer) / len(self.sbp_buffer), 1)
        moving_dbp = round(sum(self.dbp_buffer) / len(self.dbp_buffer), 1)

        # Dynamic Reliability Score r
        r = 1.0
        if sensor_quality < 0.6:
            r -= 0.35
        if pp > 80.0 and hr > 110.0:
            r -= 0.15
        r = max(0.40, min(1.0, round(r, 2)))

        # Feature engineering
        h_m = self.height / 100.0
        bmi = round(self.weight / (h_m * h_m), 1)
        bmi_x_active = round(bmi * (1 - active), 1)
        ap_hi_x_smoke = round(max(0.0, sbp - 120.0) * smoke, 1)

        # Clinical branch p_C
        z_c = (
            -0.08
            + 0.054 * (self.age - 53.0)
            + 0.046 * (sbp - 128.0)
            + 0.024 * (dbp - 82.0)
            + 0.52 * (self.chol - 1)
            + 0.35 * (self.gluc - 1)
            + 0.048 * (bmi - 27.5)
            + 0.015 * (pp - 45.0)
            + 0.018 * bmi_x_active
            + 0.014 * ap_hi_x_smoke
        )
        p_c = round(1.0 / (1.0 + math.exp(-z_c)), 4)

        # Lifestyle branch p_L
        z_l = (
            -0.12
            + 0.038 * (self.age - 53.0)
            + 0.54 * smoke
            - 0.50 * (active - 0.8)
            + 0.024 * (bmi * (1 - active))
        )
        p_l = round(1.0 / (1.0 + math.exp(-z_l)), 4)

        # Meta-learner late-fusion
        raw_meta = [p_c, p_l, r, p_l * r, (p_c - p_l) * r]
        z_meta = META_INTERCEPT
        for i in range(len(raw_meta)):
            scaled = (raw_meta[i] - SCALER_MEAN[i]) / SCALER_SCALE[i]
            z_meta += META_WEIGHTS[i] * scaled
        p_fused = round(1.0 / (1.0 + math.exp(-z_meta)), 4)

        risk_tier = "Low Risk"
        if p_fused >= 0.75:
            risk_tier = "Critical Stage Risk"
        elif p_fused >= 0.50:
            risk_tier = "High Risk"
        elif p_fused >= 0.25:
            risk_tier = "Moderate Risk"

        alert = None
        if sbp >= 170.0 or dbp >= 105.0:
            alert = {
                "level": "CRITICAL",
                "headline": f"Acute Hypertensive Surge ({int(sbp)}/{int(dbp)} mmHg)",
                "action": "Immediate cardiology evaluation and intravenous titration."
            }
        elif pp >= 65.0 and hr >= 95.0:
            alert = {
                "level": "WARNING",
                "headline": f"Malignant Pulse Pressure Disparity ({int(pp)} mmHg)",
                "action": "Order stat 12-lead ECG and serum troponin / electrolyte screening."
            }

        return {
            "tick": self.tick_count,
            "timestamp": now_iso,
            "vitals": {
                "heart_rate": hr,
                "sbp": sbp,
                "dbp": dbp,
                "map": map_val,
                "pulse_pressure": pp,
                "rpp": rpp,
                "moving_sbp": moving_sbp,
                "moving_dbp": moving_dbp,
                "sensor_quality": sensor_quality
            },
            "reliability_score": r,
            "predictions": {
                "clinical_branch_prob": p_c,
                "lifestyle_branch_prob": p_l,
                "fused_probability": p_fused,
                "risk_tier": risk_tier
            },
            "alert": alert
        }

    def stream_simulation(self, duration_ticks: int = 30, interval_seconds: float = 0.5) -> Generator[Dict[str, Any], None, None]:
        for i in range(1, duration_ticks + 1):
            phase = math.sin((i / 15.0) * math.pi)
            sbp = 135.0 + (phase * 35.0)
            dbp = 85.0 + (phase * 18.0)
            hr = 70.0 + (phase * 30.0)
            smoke = 1 if i > 8 and i < 20 else 0
            active = 1 if i > 5 and i < 22 else 0
            quality = 0.4 if (i > 10 and i < 14) else 0.98

            reading = self.compute_instantaneous_risk(sbp, dbp, hr, smoke, active, quality)
            yield reading
            time.sleep(interval_seconds)
