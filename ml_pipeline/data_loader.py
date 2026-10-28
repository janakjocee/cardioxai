"""
Data Loader and Real-World Cohort Preprocessing Module.

Loads and cleans the authentic benchmark datasets specified in Chapter 3
of Sarjan's Applied Research Project (ARP) Dissertation:
1. Primary Dataset: Kaggle Cardiovascular Disease Dataset (70,000 records)
   - Sulianova (2019) / Observational clinical examination cohort
2. Secondary Target: CDC BRFSS Diabetes Health Indicators (70,692 records)
   - Teboul (2021) / Behavioral Risk Factor Surveillance System 50-50 split
3. Cross-Check Dataset: UCI Heart Disease Cleveland Subset (303 records)
   - Detrano et al. (1989)
"""

import os
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
PRIMARY_CVD_PATH = os.path.join(DATA_DIR, 'cardio_train.csv')
BRFSS_DIABETES_PATH = os.path.join(DATA_DIR, 'diabetes_brfss.csv')
UCI_HEART_PATH = os.path.join(DATA_DIR, 'heart_uci.csv')


def load_cardiovascular_dataset(
    filepath: Optional[str] = None,
    max_records: Optional[int] = None,
    clean: bool = True
) -> pd.DataFrame:
    """
    Loads the authentic Kaggle Cardiovascular Disease dataset (70,000 records).
    Applies physiological plausibility filtering per Section 3.4.1.
    
    Columns in raw data:
    - id: patient identifier
    - age: age in days (converted to age_years)
    - gender: 1 (female), 2 (male) -> recoded to 0 (female), 1 (male)
    - height: in cm
    - weight: in kg
    - ap_hi: systolic blood pressure (mmHg)
    - ap_lo: diastolic blood pressure (mmHg)
    - cholesterol: 1 (normal), 2 (above normal), 3 (well above normal)
    - gluc: 1 (normal), 2 (above normal), 3 (well above normal)
    - smoke: 0 (no), 1 (yes)
    - alco: 0 (no), 1 (yes)
    - active: 0 (no), 1 (yes)
    - cardio: 0 (absence), 1 (presence of CVD)
    """
    path = filepath or PRIMARY_CVD_PATH
    if not os.path.exists(path):
        raise FileNotFoundError(f"Primary CVD dataset not found at {path}. Please run data download.")

    df = pd.read_csv(path, sep=';' if ';' in open(path).readline() else ',')
    
    # 1. Convert age from days to years
    if 'age' in df.columns and 'age_years' not in df.columns:
        df['age_days'] = df['age']
        df['age_years'] = np.round(df['age'] / 365.25, 1)
    
    # 2. Recode gender: Kaggle 1=Female, 2=Male -> 0=Female, 1=Male for binary classification
    if 'gender' in df.columns:
        # Standardize: 1 -> 0 (female), 2 -> 1 (male)
        if df['gender'].max() == 2 and df['gender'].min() == 1:
            df['gender_binary'] = df['gender'] - 1
        else:
            df['gender_binary'] = df['gender']
            
    # 3. Add proxy diet quality index based on healthy lifestyle adherence
    # Reflects Mediterranean Diet Score proxy (Section 3.3.2)
    if 'diet_quality' not in df.columns:
        # Construct realistic dietary adherence proxy from active, smoke, alco, and normal BMI
        bmi_proxy = df['weight'] / ((df['height'] / 100.0) ** 2)
        normal_bmi = ((bmi_proxy >= 18.5) & (bmi_proxy <= 25.0)).astype(int)
        diet_score = 2 + df['active'] - df['smoke'] - 0.5 * df['alco'] + normal_bmi
        df['diet_quality'] = np.clip(np.round(diet_score), 1, 5).astype(int)

    if clean:
        df = clean_cardiovascular_data(df)

    if max_records and len(df) > max_records:
        df = df.sample(n=max_records, random_state=42).reset_index(drop=True)

    return df


def clean_cardiovascular_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies clinical data validation and outlier filtering described in Section 3.4.1:
    - Systolic blood pressure ap_hi in [70, 240] mmHg
    - Diastolic blood pressure ap_lo in [40, 150] mmHg
    - ap_hi > ap_lo (positive pulse pressure)
    - Height in [120, 220] cm
    - Weight in [30, 200] kg
    - Implausible extremes are filtered to ensure clinical plausibility
    """
    cleaned = df.copy()
    valid_mask = (
        (cleaned['ap_hi'] >= 70) & (cleaned['ap_hi'] <= 240) &
        (cleaned['ap_lo'] >= 40) & (cleaned['ap_lo'] <= 150) &
        (cleaned['ap_hi'] > cleaned['ap_lo']) &
        (cleaned['height'] >= 120) & (cleaned['height'] <= 220) &
        (cleaned['weight'] >= 30) & (cleaned['weight'] <= 200)
    )
    
    n_before = len(cleaned)
    cleaned = cleaned[valid_mask].reset_index(drop=True)
    n_after = len(cleaned)
    n_removed = n_before - n_after
    
    # Store cleaning audit metadata
    cleaned.attrs['cleaning_audit'] = {
        'total_raw_records': n_before,
        'valid_records_retained': n_after,
        'outliers_filtered': n_removed,
        'retention_percentage': round(n_after / n_before * 100.0, 2)
    }
    return cleaned


def load_brfss_diabetes_dataset(
    filepath: Optional[str] = None,
    max_records: Optional[int] = None
) -> pd.DataFrame:
    """
    Loads authentic CDC BRFSS Diabetes Health Indicators dataset (70,692 records).
    Used for Benchmark B7: Transferability test on secondary target (T2D).
    """
    path = filepath or BRFSS_DIABETES_PATH
    if not os.path.exists(path):
        raise FileNotFoundError(f"BRFSS Diabetes dataset not found at {path}.")
        
    df = pd.read_csv(path)
    
    # Standardize column naming for pipeline transferability
    df = df.rename(columns={
        'Diabetes_binary': 'diabetes',
        'Sex': 'gender',
        'Age': 'age_category',
        'BMI': 'bmi',
        'Smoker': 'smoke',
        'PhysActivity': 'active',
        'HighBP': 'high_bp',
        'HighChol': 'high_chol',
        'HvyAlcoholConsump': 'heavy_alcohol',
        'GenHlth': 'gen_health'
    })
    
    # Ensure binary target
    df['diabetes'] = df['diabetes'].astype(int)
    
    if max_records and len(df) > max_records:
        df = df.sample(n=max_records, random_state=42).reset_index(drop=True)
        
    return df


def load_uci_cleveland_dataset(filepath: Optional[str] = None) -> pd.DataFrame:
    """
    Loads authentic UCI Cleveland Heart Disease dataset (303 records).
    Used for primary CVD cross-check and clinical reference validation.
    """
    path = filepath or UCI_HEART_PATH
    if not os.path.exists(path):
        raise FileNotFoundError(f"UCI Cleveland dataset not found at {path}.")
        
    df = pd.read_csv(path)
    
    # Target is binary heart disease (0=absence, >0=presence)
    if 'target' in df.columns:
        df['cardio'] = (df['target'] > 0).astype(int)
    return df


def get_dataset_profile(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generates summary statistics and demographic profile for the cohort.
    """
    profile = {
        'total_samples': len(df),
        'positive_prevalence': float(round(df['cardio'].mean(), 4)) if 'cardio' in df.columns else None,
        'mean_age': float(round(df['age_years'].mean(), 1)) if 'age_years' in df.columns else None,
        'female_pct': float(round((df['gender'] == 1).mean() * 100, 1)) if 'gender' in df.columns else None,
        'smoker_pct': float(round(df['smoke'].mean() * 100, 1)) if 'smoke' in df.columns else None,
        'active_pct': float(round(df['active'].mean() * 100, 1)) if 'active' in df.columns else None,
        'mean_sbp': float(round(df['ap_hi'].mean(), 1)) if 'ap_hi' in df.columns else None,
        'mean_dbp': float(round(df['ap_lo'].mean(), 1)) if 'ap_lo' in df.columns else None,
        'mean_weight': float(round(df['weight'].mean(), 1)) if 'weight' in df.columns else None,
        'mean_height': float(round(df['height'].mean(), 1)) if 'height' in df.columns else None
    }
    return profile
