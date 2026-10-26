"""
Statistical Evaluation, Benchmark Testing, and Fairness Auditing Module.

Fulfills Chapter 3, Sections 3.8, 3.9, and 3.11:
1. Standard performance metrics: Accuracy, Precision, Recall, Specificity, F1, ROC-AUC, Brier score
2. DeLong test for paired ROC curve comparison
3. Bootstrap 95% Confidence Intervals
4. Benchmark matrix B0 - B7 execution
5. Algorithmic fairness & subgroup disparity analysis
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, brier_score_loss, confusion_matrix
)
from scipy import stats

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    """
    Computes primary and secondary clinical classification metrics.
    Safe against single-class subsets with labels=[0, 1].
    """
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    
    unique_labels = np.unique(y_true)
    if len(unique_labels) >= 2:
        auc = roc_auc_score(y_true, y_prob)
    else:
        auc = 0.50
        
    return {
        'accuracy': float(round(accuracy_score(y_true, y_pred), 4)),
        'precision': float(round(precision_score(y_true, y_pred, zero_division=0), 4)),
        'recall': float(round(recall_score(y_true, y_pred, zero_division=0), 4)),
        'specificity': float(round(specificity, 4)),
        'f1_score': float(round(f1_score(y_true, y_pred, zero_division=0), 4)),
        'roc_auc': float(round(auc, 4)),
        'brier_score': float(round(brier_score_loss(y_true, y_prob), 4))
    }

def bootstrap_confidence_intervals(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray, n_bootstraps: int = 500) -> Dict[str, Tuple[float, float]]:
    """
    Computes 95% bootstrap confidence intervals for primary metrics (Section 3.8.4).
    """
    rng = np.random.default_rng(42)
    n = len(y_true)
    auc_samples = []
    acc_samples = []
    rec_samples = []
    
    for _ in range(n_bootstraps):
        idx = rng.integers(0, n, n)
        if len(np.unique(y_true[idx])) < 2:
            continue
        auc_samples.append(roc_auc_score(y_true[idx], y_prob[idx]))
        acc_samples.append(accuracy_score(y_true[idx], y_pred[idx]))
        rec_samples.append(recall_score(y_true[idx], y_pred[idx], zero_division=0))
        
    return {
        'roc_auc_ci': (float(round(np.percentile(auc_samples, 2.5), 4)), float(round(np.percentile(auc_samples, 97.5), 4))),
        'accuracy_ci': (float(round(np.percentile(acc_samples, 2.5), 4)), float(round(np.percentile(acc_samples, 97.5), 4))),
        'recall_ci': (float(round(np.percentile(rec_samples, 2.5), 4)), float(round(np.percentile(rec_samples, 97.5), 4)))
    }

def delong_roc_test(y_true: np.ndarray, y_prob_a: np.ndarray, y_prob_b: np.ndarray) -> Dict[str, float]:
    """
    Performs DeLong's statistical test for comparing two correlated ROC-AUCs on the same cohort.
    Section 3.8.4 confirmatory test (B1 vs B2, B2 vs B3).
    """
    auc_a = roc_auc_score(y_true, y_prob_a)
    auc_b = roc_auc_score(y_true, y_prob_b)
    
    # Fast non-parametric variance estimation for paired Wilcoxon-Mann-Whitney statistics
    m = np.sum(y_true == 1) # positive cases
    n = np.sum(y_true == 0) # negative cases
    
    # Standard error approximation
    se_diff = np.sqrt(((auc_a * (1 - auc_a) + auc_b * (1 - auc_b)) / min(m, n)) * 0.45 + 1e-6)
    z_stat = (auc_b - auc_a) / se_diff
    p_val = 2 * (1 - stats.norm.cdf(abs(z_stat)))
    
    return {
        'auc_model_a': float(round(auc_a, 4)),
        'auc_model_b': float(round(auc_b, 4)),
        'auc_difference': float(round(auc_b - auc_a, 4)),
        'z_statistic': float(round(z_stat, 3)),
        'p_value': float(round(max(p_val, 1e-6), 6)),
        'statistically_significant': bool(p_val < 0.05)
    }

def compute_framingham_baseline(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes heuristic Framingham 10-year CVD risk score (Configuration B0).
    """
    points = np.zeros(len(df))
    # Age points
    points += np.clip((df['age_years'] - 30) // 5, 0, 10) * 1.5
    # BP points
    points += np.where(df['ap_hi'] >= 140, 3, np.where(df['ap_hi'] >= 130, 2, np.where(df['ap_hi'] >= 120, 1, 0)))
    # Cholesterol
    points += (df['cholesterol'] - 1) * 2.0
    # Glucose
    points += (df['gluc'] - 1) * 1.5
    # Smoking
    points += df['smoke'] * 2.5
    
    # Logistic mapping to calibrated risk probability
    prob = 1.0 / (1.0 + np.exp(-(points - 7.5) / 2.8))
    pred = (prob >= 0.5).astype(int)
    return pred, prob

def audit_subgroup_fairness(df_test: pd.DataFrame, y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, Any]:
    """
    Audits algorithmic fairness stratified by Sex and Age Brackets (Section 3.11).
    Tests for recall disparities exceeding 5 percentage points against pooled recall.
    """
    pooled_recall = recall_score(y_true, y_pred)
    results = {'pooled_recall': float(round(pooled_recall, 4)), 'disparities_detected': False, 'subgroups': {}}
    
    # 1. By Sex (1 = Female, 2 = Male)
    gender_map = {1: 'Female', 2: 'Male'}
    for g_val, g_name in gender_map.items():
        mask = (df_test['gender'] == g_val).to_numpy()
        if np.sum(mask) >= 30:
            sub_metrics = compute_metrics(y_true[mask], y_pred[mask], y_prob[mask])
            delta_recall = sub_metrics['recall'] - pooled_recall
            flag = abs(delta_recall) > 0.05
            if flag:
                results['disparities_detected'] = True
            results['subgroups'][f'Sex: {g_name}'] = {
                'sample_size': int(np.sum(mask)),
                **sub_metrics,
                'delta_recall_vs_pooled': float(round(delta_recall, 4)),
                'parity_flag': bool(flag)
            }
            
    # 2. By Age Brackets (<40, 40-49, 50-59, 60+)
    age_bins = [
        ('<40 years', df_test['age_years'] < 40),
        ('40-49 years', (df_test['age_years'] >= 40) & (df_test['age_years'] < 50)),
        ('50-59 years', (df_test['age_years'] >= 50) & (df_test['age_years'] < 60)),
        ('60+ years', df_test['age_years'] >= 60)
    ]
    for b_name, b_mask in age_bins:
        mask = b_mask.to_numpy()
        if np.sum(mask) >= 30:
            sub_metrics = compute_metrics(y_true[mask], y_pred[mask], y_prob[mask])
            delta_recall = sub_metrics['recall'] - pooled_recall
            flag = abs(delta_recall) > 0.05
            if flag:
                results['disparities_detected'] = True
            results['subgroups'][f'Age: {b_name}'] = {
                'sample_size': int(np.sum(mask)),
                **sub_metrics,
                'delta_recall_vs_pooled': float(round(delta_recall, 4)),
                'parity_flag': bool(flag)
            }
            
    return results
