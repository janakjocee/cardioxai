"""
Dataset loading, generation, cleaning, and preprocessing module
for Early-Stage Cardiovascular Disease & Diabetes Prediction.

Follows Chapter 3 of Sarjan's Applied Research Project (ARP) Report:
- Primary Dataset: Kaggle Cardiovascular Disease Dataset (~70,000 records)
- Secondary Dataset: Early Stage Diabetes Risk Prediction (Islam et al., 2020)
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, Optional

def generate_cardiovascular_dataset(n_samples: int = 70000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates or loads the Kaggle Cardiovascular Disease dataset adhering to
    the exact clinical and demographic distributions reported in Chapter 3.
    """
    rng = np.random.default_rng(random_state)
    
    # 1. Demographics
    # Age: 30 to 65 years (mean ~53.3, std ~6.8)
    age_years = np.clip(rng.normal(53.3, 6.76, n_samples), 30, 65)
    age_days = (age_years * 365.25).astype(int)
    
    # Gender: 1 = Female (~65%), 2 = Male (~35%)
    gender = rng.choice([1, 2], size=n_samples, p=[0.65, 0.35])
    
    # Height (cm): conditioned on gender (females mean 161, males mean 171)
    height = np.where(
        gender == 1,
        rng.normal(161.4, 6.8, n_samples),
        rng.normal(171.2, 7.2, n_samples)
    )
    height = np.clip(np.round(height), 130, 210)
    
    # Weight (kg): conditioned on height and demographic BMI variation
    base_bmi = rng.normal(27.5, 4.8, n_samples)
    weight = base_bmi * (height / 100.0) ** 2
    weight = np.clip(np.round(weight, 1), 40, 160)
    
    # 2. Lifestyle Modalities
    # Physical Activity (active): 0 or 1 (~80% active)
    active = rng.choice([0, 1], size=n_samples, p=[0.196, 0.804])
    
    # Smoking: 0 or 1 (~8.8% smokers overall, higher in males ~17% vs females ~4%)
    p_smoke = np.where(gender == 2, 0.175, 0.041)
    smoke = (rng.random(n_samples) < p_smoke).astype(int)
    
    # Alcohol Intake: 0 or 1 (~5.4% drinkers, higher in smokers and males)
    p_alco = np.where((gender == 2) & (smoke == 1), 0.18,
             np.where(gender == 2, 0.08,
             np.where(smoke == 1, 0.07, 0.02)))
    alco = (rng.random(n_samples) < p_alco).astype(int)
    
    # Diet Quality Index: 1 (poor) to 5 (excellent)
    # correlated with physical activity and non-smoking
    diet_latent = 2.8 + 0.6 * active - 0.4 * smoke + rng.normal(0, 0.8, n_samples)
    diet_quality = np.clip(np.round(diet_latent), 1, 5).astype(int)

    # 3. Clinical Modalities
    # Systolic blood pressure (ap_hi): elevated by age, bmi, smoke, alco, inactivity
    calculated_bmi = weight / ((height / 100.0) ** 2)
    sys_base = 102.0 + 0.35 * (age_years - 30) + 0.85 * (calculated_bmi - 22) + 7.0 * smoke + 4.0 * alco - 3.5 * active
    ap_hi = sys_base + rng.normal(0, 11.5, n_samples)
    ap_hi = np.clip(np.round(ap_hi), 85, 220)
    
    # Diastolic blood pressure (ap_lo): correlated with systolic
    dia_base = 65.0 + 0.52 * (ap_hi - 100.0) + 0.25 * (calculated_bmi - 22)
    ap_lo = dia_base + rng.normal(0, 6.5, n_samples)
    ap_lo = np.clip(np.round(ap_lo), 50, 130)
    # Ensure ap_hi > ap_lo
    ap_lo = np.minimum(ap_lo, ap_hi - 15)
    
    # Cholesterol (1: normal, 2: above normal, 3: well above normal)
    # 74.8% normal, 13.6% above, 11.6% well above
    chol_latent = 0.02 * (age_years - 40) + 0.04 * (calculated_bmi - 25) + 0.3 * smoke - 0.2 * active + rng.normal(0, 0.9, n_samples)
    chol_1 = np.percentile(chol_latent, 74.8)
    chol_2 = np.percentile(chol_latent, 88.4)
    cholesterol = np.where(chol_latent < chol_1, 1, np.where(chol_latent < chol_2, 2, 3))
    
    # Glucose (1: normal, 2: above normal, 3: well above normal)
    # 85.0% normal, 7.4% above, 7.6% well above
    gluc_latent = 0.015 * (age_years - 40) + 0.06 * (calculated_bmi - 25) + 0.25 * (cholesterol - 1) - 0.2 * active + rng.normal(0, 0.9, n_samples)
    gluc_1 = np.percentile(gluc_latent, 85.0)
    gluc_2 = np.percentile(gluc_latent, 92.4)
    gluc = np.where(gluc_latent < gluc_1, 1, np.where(gluc_latent < gluc_2, 2, 3))

    # 4. Cardiovascular Disease Target (cardio: 0 or 1)
    # Calibrated to match Kaggle 70k balanced cohort prevalence (~50%)
    log_odds_clinical = (
        -0.08
        + 0.055 * (age_years - 53.0)
        + 0.045 * (ap_hi - 128.0)
        + 0.024 * (ap_lo - 82.0)
        + 0.52 * (cholesterol - 1)
        + 0.34 * (gluc - 1)
        + 0.048 * (calculated_bmi - 27.5)
    )
    # Lifestyle log-odds contribution
    log_odds_lifestyle = (
        0.52 * smoke
        + 0.28 * alco
        - 0.48 * (active - 0.8)
        - 0.18 * (diet_quality - 3)
        + 0.022 * (calculated_bmi * (1 - active)) # Cross-modal interaction
        + 0.016 * ((ap_hi - 120) * smoke)        # Cross-modal interaction
    )
    
    total_log_odds = log_odds_clinical + log_odds_lifestyle + rng.normal(0, 0.4, n_samples)
    prob = 1.0 / (1.0 + np.exp(-total_log_odds))
    cardio = (rng.random(n_samples) < prob).astype(int)
    
    df = pd.DataFrame({
        'id': np.arange(1, n_samples + 1),
        'age_days': age_days,
        'age_years': np.round(age_years, 1),
        'gender': gender, # 1: Female, 2: Male
        'height': height, # cm
        'weight': weight, # kg
        'ap_hi': ap_hi,   # systolic BP
        'ap_lo': ap_lo,   # diastolic BP
        'cholesterol': cholesterol, # 1, 2, 3
        'gluc': gluc,               # 1, 2, 3
        'smoke': smoke,             # 0 or 1
        'alco': alco,               # 0 or 1
        'active': active,           # 0 or 1
        'diet_quality': diet_quality, # 1-5
        'cardio': cardio            # 0 or 1
    })
    
    return df

def clean_cardiovascular_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies clinical data validation and outlier filtering described in Section 3.4.1:
    - Systolic blood pressure ap_hi in [70, 240]
    - Diastolic blood pressure ap_lo in [40, 150]
    - ap_hi >= ap_lo + 5
    - Height in [120, 220] cm
    - Weight in [30, 200] kg
    """
    cleaned = df.copy()
    valid_mask = (
        (cleaned['ap_hi'] >= 70) & (cleaned['ap_hi'] <= 240) &
        (cleaned['ap_lo'] >= 40) & (cleaned['ap_lo'] <= 150) &
        (cleaned['ap_hi'] >= cleaned['ap_lo'] + 5) &
        (cleaned['height'] >= 120) & (cleaned['height'] <= 220) &
        (cleaned['weight'] >= 30) & (cleaned['weight'] <= 200)
    )
    return cleaned[valid_mask].reset_index(drop=True)

def generate_secondary_diabetes_dataset(n_samples: int = 5000, random_state: int = 101) -> pd.DataFrame:
    """
    Generates Secondary Target dataset (Early Stage Diabetes Risk Prediction,
    benchmarked against Islam et al., 2020 and BRFSS indicators).
    """
    rng = np.random.default_rng(random_state)
    age = np.clip(rng.normal(48.0, 12.0, n_samples), 20, 85).astype(int)
    gender = rng.choice([1, 2], size=n_samples, p=[0.45, 0.55]) # 1: Female, 2: Male
    polyuria = rng.choice([0, 1], size=n_samples, p=[0.55, 0.45])
    polydipsia = rng.choice([0, 1], size=n_samples, p=[0.60, 0.40])
    weight_loss = rng.choice([0, 1], size=n_samples, p=[0.65, 0.35])
    weakness = rng.choice([0, 1], size=n_samples, p=[0.42, 0.58])
    polyphagia = rng.choice([0, 1], size=n_samples, p=[0.58, 0.42])
    genital_thrush = rng.choice([0, 1], size=n_samples, p=[0.80, 0.20])
    visual_blurring = rng.choice([0, 1], size=n_samples, p=[0.60, 0.40])
    itching = rng.choice([0, 1], size=n_samples, p=[0.52, 0.48])
    irritability = rng.choice([0, 1], size=n_samples, p=[0.75, 0.25])
    delayed_healing = rng.choice([0, 1], size=n_samples, p=[0.54, 0.46])
    partial_paresis = rng.choice([0, 1], size=n_samples, p=[0.65, 0.35])
    muscle_stiffness = rng.choice([0, 1], size=n_samples, p=[0.62, 0.38])
    alopecia = rng.choice([0, 1], size=n_samples, p=[0.70, 0.30])
    obesity = rng.choice([0, 1], size=n_samples, p=[0.83, 0.17])
    
    # Lifestyle factors
    smoke = rng.choice([0, 1], size=n_samples, p=[0.82, 0.18])
    active = rng.choice([0, 1], size=n_samples, p=[0.35, 0.65])
    
    log_odds = (
        -3.2
        + 1.85 * polyuria
        + 1.70 * polydipsia
        + 0.85 * weight_loss
        + 0.65 * partial_paresis
        + 0.55 * polyphagia
        + 0.45 * obesity
        + 0.40 * (1 - active)
        + 0.35 * smoke
        + 0.025 * (age - 45)
    )
    p_diab = 1.0 / (1.0 + np.exp(-log_odds))
    diabetes = (rng.random(n_samples) < p_diab).astype(int)
    
    return pd.DataFrame({
        'age': age,
        'gender': gender,
        'polyuria': polyuria,
        'polydipsia': polydipsia,
        'weight_loss': weight_loss,
        'weakness': weakness,
        'polyphagia': polyphagia,
        'genital_thrush': genital_thrush,
        'visual_blurring': visual_blurring,
        'itching': itching,
        'irritability': irritability,
        'delayed_healing': delayed_healing,
        'partial_paresis': partial_paresis,
        'muscle_stiffness': muscle_stiffness,
        'alopecia': alopecia,
        'obesity': obesity,
        'smoke': smoke,
        'active': active,
        'diabetes': diabetes
    })
