"""
Dataset loading, generation, cleaning, and preprocessing module
for Early-Stage Cardiovascular Disease & Diabetes Prediction.

Maintains backward compatibility while prioritizing authentic real-world data:
- Primary Dataset: Kaggle Cardiovascular Disease Dataset (70,000 real records)
- Secondary Dataset: CDC BRFSS Diabetes Health Indicators (70,692 real records)
- Cross-Check Dataset: UCI Heart Disease Cleveland (303 real records)
"""

import os
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, Optional

try:
    from ml_pipeline.data_loader import (
        load_cardiovascular_dataset,
        clean_cardiovascular_data,
        load_brfss_diabetes_dataset,
        load_uci_cleveland_dataset,
        get_dataset_profile
    )
except ImportError:
    from data_loader import (
        load_cardiovascular_dataset,
        clean_cardiovascular_data,
        load_brfss_diabetes_dataset,
        load_uci_cleveland_dataset,
        get_dataset_profile
    )


def generate_cardiovascular_dataset(n_samples: int = 70000, random_state: int = 42) -> pd.DataFrame:
    """
    Loads authentic real-world Kaggle CVD data if available, or falls back to synthetic generation.
    """
    try:
        return load_cardiovascular_dataset(max_records=n_samples, clean=False)
    except Exception as e:
        print(f"[Notice] Loading fallback synthetic data due to: {e}")
        return _generate_synthetic_cvd(n_samples=n_samples, random_state=random_state)


def generate_secondary_diabetes_dataset(n_samples: int = 5000, random_state: int = 101) -> pd.DataFrame:
    """
    Loads authentic CDC BRFSS Diabetes dataset or fallback synthetic data.
    """
    try:
        return load_brfss_diabetes_dataset(max_records=n_samples)
    except Exception as e:
        print(f"[Notice] Loading fallback synthetic diabetes data due to: {e}")
        return _generate_synthetic_diabetes(n_samples=n_samples, random_state=random_state)


def _generate_synthetic_cvd(n_samples: int = 70000, random_state: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)
    age_years = np.clip(rng.normal(53.3, 6.76, n_samples), 30, 65)
    age_days = (age_years * 365.25).astype(int)
    gender = rng.choice([1, 2], size=n_samples, p=[0.65, 0.35])
    height = np.where(gender == 1, rng.normal(161.4, 6.8, n_samples), rng.normal(171.2, 7.2, n_samples))
    height = np.clip(np.round(height), 130, 210)
    base_bmi = rng.normal(27.5, 4.8, n_samples)
    weight = np.clip(np.round(base_bmi * (height / 100.0) ** 2, 1), 40, 160)
    active = rng.choice([0, 1], size=n_samples, p=[0.196, 0.804])
    p_smoke = np.where(gender == 2, 0.175, 0.041)
    smoke = (rng.random(n_samples) < p_smoke).astype(int)
    p_alco = np.where((gender == 2) & (smoke == 1), 0.18, np.where(gender == 2, 0.08, np.where(smoke == 1, 0.07, 0.02)))
    alco = (rng.random(n_samples) < p_alco).astype(int)
    diet_latent = 2.8 + 0.6 * active - 0.4 * smoke + rng.normal(0, 0.8, n_samples)
    diet_quality = np.clip(np.round(diet_latent), 1, 5).astype(int)
    calculated_bmi = weight / ((height / 100.0) ** 2)
    sys_base = 102.0 + 0.35 * (age_years - 30) + 0.85 * (calculated_bmi - 22) + 7.0 * smoke + 4.0 * alco - 3.5 * active
    ap_hi = np.clip(np.round(sys_base + rng.normal(0, 11.5, n_samples)), 85, 220)
    dia_base = 65.0 + 0.52 * (ap_hi - 100.0) + 0.25 * (calculated_bmi - 22)
    ap_lo = np.minimum(np.clip(np.round(dia_base + rng.normal(0, 6.5, n_samples)), 50, 130), ap_hi - 15)
    chol_latent = 0.02 * (age_years - 40) + 0.04 * (calculated_bmi - 25) + 0.3 * smoke - 0.2 * active + rng.normal(0, 0.9, n_samples)
    cholesterol = np.where(chol_latent < np.percentile(chol_latent, 74.8), 1, np.where(chol_latent < np.percentile(chol_latent, 88.4), 2, 3))
    gluc_latent = 0.015 * (age_years - 40) + 0.06 * (calculated_bmi - 25) + 0.25 * (cholesterol - 1) - 0.2 * active + rng.normal(0, 0.9, n_samples)
    gluc = np.where(gluc_latent < np.percentile(gluc_latent, 85.0), 1, np.where(gluc_latent < np.percentile(gluc_latent, 92.4), 2, 3))
    log_odds = -0.08 + 0.055 * (age_years - 53.0) + 0.045 * (ap_hi - 128.0) + 0.024 * (ap_lo - 82.0) + 0.52 * (cholesterol - 1) + 0.34 * (gluc - 1) + 0.048 * (calculated_bmi - 27.5) + 0.52 * smoke + 0.28 * alco - 0.48 * (active - 0.8) - 0.18 * (diet_quality - 3)
    cardio = (rng.random(n_samples) < (1.0 / (1.0 + np.exp(-log_odds)))).astype(int)
    return pd.DataFrame({
        'id': np.arange(1, n_samples + 1), 'age_days': age_days, 'age_years': np.round(age_years, 1),
        'gender': gender, 'height': height, 'weight': weight, 'ap_hi': ap_hi, 'ap_lo': ap_lo,
        'cholesterol': cholesterol, 'gluc': gluc, 'smoke': smoke, 'alco': alco, 'active': active,
        'diet_quality': diet_quality, 'cardio': cardio
    })


def _generate_synthetic_diabetes(n_samples: int = 5000, random_state: int = 101) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)
    age = np.clip(rng.normal(48.0, 12.0, n_samples), 20, 80).astype(int)
    gender = rng.choice([0, 1], size=n_samples, p=[0.40, 0.60])
    polyuria = rng.choice([0, 1], size=n_samples, p=[0.55, 0.45])
    polydipsia = rng.choice([0, 1], size=n_samples, p=[0.60, 0.40])
    weight_loss = rng.choice([0, 1], size=n_samples, p=[0.65, 0.35])
    weakness = rng.choice([0, 1], size=n_samples, p=[0.45, 0.55])
    polyphagia = rng.choice([0, 1], size=n_samples, p=[0.62, 0.38])
    obesity = rng.choice([0, 1], size=n_samples, p=[0.75, 0.25])
    smoke = rng.choice([0, 1], size=n_samples, p=[0.80, 0.20])
    active = rng.choice([0, 1], size=n_samples, p=[0.35, 0.65])
    latent = -2.5 + 2.2 * polyuria + 2.4 * polydipsia + 0.9 * weight_loss + 0.5 * weakness + 0.6 * polyphagia + 0.7 * obesity + 0.4 * smoke - 0.5 * active + 0.02 * (age - 45)
    diabetes = (rng.random(n_samples) < (1.0 / (1.0 + np.exp(-latent)))).astype(int)
    return pd.DataFrame({
        'age': age, 'gender': gender, 'polyuria': polyuria, 'polydipsia': polydipsia,
        'weight_loss': weight_loss, 'weakness': weakness, 'polyphagia': polyphagia,
        'obesity': obesity, 'smoke': smoke, 'active': active, 'diabetes': diabetes
    })
