"""
Feature Engineering and Modality Separation Module.

Implements:
1. Clinical modality group (Group C + Demographics D)
2. Lifestyle modality group (Group L + Demographics D)
3. Declared cross-modal interaction features (Section 3.5.2)
4. Per-record Lifestyle Reliability Score r in [0, 1] (Section 3.6.2)
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any

CLINICAL_COLS = ['age_years', 'gender', 'height', 'weight', 'bmi', 'ap_hi', 'ap_lo', 'pulse_pressure', 'map', 'cholesterol', 'gluc']
LIFESTYLE_COLS = ['age_years', 'gender', 'smoke', 'alco', 'active', 'diet_quality']
INTERACTION_COLS = ['bmi_x_active', 'ap_hi_x_smoke', 'ap_hi_x_active', 'alco_x_gluc', 'age_x_ap_hi']
ALL_FEATURE_COLS = CLINICAL_COLS + [c for c in LIFESTYLE_COLS if c not in ['age_years', 'gender']] + INTERACTION_COLS

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes derived clinical metrics, interaction terms, and lifestyle reliability scores.
    """
    df = df.copy()
    
    # 1. Height in meters and BMI
    h_m = df['height'] / 100.0
    df['bmi'] = np.round(df['weight'] / (h_m ** 2), 2)
    
    # 2. Hemodynamic variables
    df['pulse_pressure'] = df['ap_hi'] - df['ap_lo']
    df['map'] = np.round(df['ap_lo'] + (df['pulse_pressure'] / 3.0), 2)
    
    # 3. Blood pressure stage classification (AHA/ACC 2017)
    # Normal (<120 and <80), Elevated (120-129 and <80), Stage 1 (130-139 or 80-89), Stage 2 (>=140 or >=90)
    conditions = [
        (df['ap_hi'] < 120) & (df['ap_lo'] < 80),
        (df['ap_hi'] >= 120) & (df['ap_hi'] <= 129) & (df['ap_lo'] < 80),
        ((df['ap_hi'] >= 130) & (df['ap_hi'] <= 139)) | ((df['ap_lo'] >= 80) & (df['ap_lo'] <= 89)),
        (df['ap_hi'] >= 140) | (df['ap_lo'] >= 90)
    ]
    choices = [0, 1, 2, 3] # 0: Normal, 1: Elevated, 2: Stage 1, 3: Stage 2
    df['bp_stage'] = np.select(conditions, choices, default=2)

    # 4. Declared Cross-modal Interaction Terms (Section 3.5.2)
    df['bmi_x_active'] = np.round(df['bmi'] * (1 - df['active']), 2) # Excess BMI penalty compounded by inactivity
    df['ap_hi_x_smoke'] = np.round((df['ap_hi'] - 120.0).clip(lower=0) * df['smoke'], 2)
    df['ap_hi_x_active'] = np.round(df['ap_hi'] * df['active'], 2)
    df['alco_x_gluc'] = np.round(df['alco'] * (df['gluc'] - 1), 2)
    df['age_x_ap_hi'] = np.round((df['age_years'] / 50.0) * (df['ap_hi'] / 120.0), 3)
    
    # 5. Lifestyle Reliability Score r in [0, 1] (Section 3.6.2)
    # Computes per-record data quality across completeness, internal consistency, and plausibility
    df['lifestyle_reliability'] = compute_reliability_score(df)
    
    return df

def compute_reliability_score(df: pd.DataFrame) -> np.ndarray:
    """
    Computes per-record reliability score r in [0, 1] from three evidence sources:
    1. Completeness: Non-missingness of behavioural fields (smoke, alco, active, diet)
    2. Consistency: Logic checks (e.g. extreme reported inactivity with marathon-level metrics or vice-versa)
    3. Physiological plausibility of self-reported lifestyle
    """
    n = len(df)
    r = np.ones(n, dtype=float)
    
    # Check completeness
    for col in ['smoke', 'alco', 'active', 'diet_quality']:
        if col in df.columns:
            missing_penalty = df[col].isna().astype(float) * 0.15
            r -= missing_penalty
            
    # Check consistency: e.g. heavy smoker & alcohol reporting top diet index 5
    if 'smoke' in df.columns and 'alco' in df.columns and 'diet_quality' in df.columns:
        suspicious_diet = ((df['smoke'] == 1) & (df['alco'] == 1) & (df['diet_quality'] == 5)).astype(float) * 0.10
        r -= suspicious_diet
        
    # Check plausibility: active=1 while severe morbid obesity (BMI > 45) with Stage 2 crisis
    if 'bmi' in df.columns and 'active' in df.columns and 'ap_hi' in df.columns:
        implausible_active = ((df['bmi'] > 42.0) & (df['ap_hi'] > 180.0) & (df['active'] == 1)).astype(float) * 0.08
        r -= implausible_active
        
    return np.clip(r, 0.40, 1.0)

def split_modalities(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, np.ndarray, np.ndarray]:
    """
    Splits feature matrix into:
    - X_clinical: Group C features + Demographics D + Declared interaction features
    - X_lifestyle: Group L features + Demographics D
    - X_early_fusion: Concatenation of all clinical and lifestyle features
    - r: Reliability scores
    - y: Ground truth target
    """
    y = df['cardio'].to_numpy()
    r = df['lifestyle_reliability'].to_numpy()
    
    # Clinical branch features (including interactions supplied to clinical branch per Figure 3.1)
    clinical_feature_set = [c for c in CLINICAL_COLS if c in df.columns] + [c for c in INTERACTION_COLS if c in df.columns]
    X_clinical = df[clinical_feature_set].copy()
    
    # Lifestyle branch features
    lifestyle_feature_set = [c for c in LIFESTYLE_COLS if c in df.columns]
    X_lifestyle = df[lifestyle_feature_set].copy()
    
    # Early fusion features (concatenation)
    all_cols = [c for c in ALL_FEATURE_COLS if c in df.columns]
    X_early_fusion = df[all_cols].copy()
    
    return X_clinical, X_lifestyle, X_early_fusion, r, y
