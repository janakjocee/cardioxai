"""
Enhanced ML Pipeline Export for CardioXAI Frontend.

Re-runs the complete training pipeline and exports ALL artifacts needed
by the Next.js frontend to make real predictions without faking anything:
- Branch model coefficients (from actual Logistic Regression fits)
- Real SHAP base values and feature importance distributions
- Calibrated conformal quantile from held-out calibration set
- Real fairness audit data with actual parity flags
- Baseline risk distribution deciles for drift monitoring
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, brier_score_loss, confusion_matrix
)

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml_pipeline.data_loader import (
    load_cardiovascular_dataset,
    load_brfss_diabetes_dataset
)
from ml_pipeline.feature_engineering import (
    engineer_features,
    split_modalities,
    ALL_FEATURE_COLS,
    CLINICAL_COLS,
    LIFESTYLE_COLS
)
from ml_pipeline.models import DualBranchLateFusion
from ml_pipeline.evaluation import (
    compute_metrics,
    delong_roc_test,
    bootstrap_confidence_intervals,
    compute_framingham_baseline,
    audit_subgroup_fairness
)
from ml_pipeline.conformal import InductiveConformalCalibrator


def extract_logistic_coefficients(pipeline_or_model, feature_names):
    """Extract coefficients from a LogisticRegression (possibly inside a Pipeline)."""
    if hasattr(pipeline_or_model, 'named_steps'):
        lr = pipeline_or_model.named_steps.get('clf', pipeline_or_model)
    else:
        lr = pipeline_or_model
    
    if hasattr(lr, 'coef_'):
        coefs = lr.coef_[0]
        intercept = float(lr.intercept_[0])
        return {
            'coefficients': {name: float(round(c, 6)) for name, c in zip(feature_names, coefs)},
            'intercept': float(round(intercept, 6))
        }
    return None


def run_enhanced_export():
    print("=" * 75)
    print("CARDIOXAI ENHANCED EXPORT: Real Model Artifacts for Frontend")
    print("=" * 75)

    # ─── 1. Load & Clean ───
    print("\n[1/8] Loading authentic Kaggle CVD cohort...")
    df = load_cardiovascular_dataset(max_records=40000, clean=True)
    cleaning_meta = df.attrs.get('cleaning_audit', {})
    print(f"  → {len(df)} records loaded")

    # ─── 2. Feature Engineering ───
    print("\n[2/8] Engineering features & modality splits...")
    fe_df = engineer_features(df)

    # 3-way split: train / calibration / test (60% / 20% / 20%)
    train_df, temp_df = train_test_split(
        fe_df, test_size=0.40, stratify=fe_df['cardio'], random_state=42
    )
    cal_df, test_df = train_test_split(
        temp_df, test_size=0.50, stratify=temp_df['cardio'], random_state=42
    )
    print(f"  → Train: {len(train_df)}, Calibration: {len(cal_df)}, Test: {len(test_df)}")

    X_c_train, X_l_train, X_early_train, r_train, y_train = split_modalities(train_df)
    X_c_cal, X_l_cal, X_early_cal, r_cal, y_cal = split_modalities(cal_df)
    X_c_test, X_l_test, X_early_test, r_test, y_test = split_modalities(test_df)

    # ─── 3. Train Clinical Branch (Logistic Regression for exportable coefficients) ───
    print("\n[3/8] Training exportable Clinical Branch (Logistic Regression)...")
    clinical_features = [c for c in CLINICAL_COLS if c in train_df.columns]
    clinical_scaler = StandardScaler()
    X_c_train_scaled = clinical_scaler.fit_transform(X_c_train[clinical_features].to_numpy())
    X_c_cal_scaled = clinical_scaler.transform(X_c_cal[clinical_features].to_numpy())
    X_c_test_scaled = clinical_scaler.transform(X_c_test[clinical_features].to_numpy())

    clinical_lr = LogisticRegression(C=0.1, max_iter=2000, random_state=42)
    clinical_lr.fit(X_c_train_scaled, y_train)

    clinical_coefs = {
        'features': clinical_features,
        'coefficients': [float(round(c, 6)) for c in clinical_lr.coef_[0]],
        'intercept': float(round(clinical_lr.intercept_[0], 6)),
        'scaler_mean': [float(round(m, 6)) for m in clinical_scaler.mean_],
        'scaler_scale': [float(round(s, 6)) for s in clinical_scaler.scale_]
    }
    print(f"  → Clinical LR fitted: {len(clinical_features)} features")

    # ─── 4. Train Lifestyle Branch (Logistic Regression) ───
    print("\n[4/8] Training exportable Lifestyle Branch (Logistic Regression)...")
    lifestyle_features = [c for c in LIFESTYLE_COLS if c in train_df.columns]
    lifestyle_scaler = StandardScaler()
    X_l_train_scaled = lifestyle_scaler.fit_transform(X_l_train[lifestyle_features].to_numpy())
    X_l_cal_scaled = lifestyle_scaler.transform(X_l_cal[lifestyle_features].to_numpy())
    X_l_test_scaled = lifestyle_scaler.transform(X_l_test[lifestyle_features].to_numpy())

    lifestyle_lr = LogisticRegression(C=0.1, max_iter=2000, random_state=42)
    lifestyle_lr.fit(X_l_train_scaled, y_train)

    lifestyle_coefs = {
        'features': lifestyle_features,
        'coefficients': [float(round(c, 6)) for c in lifestyle_lr.coef_[0]],
        'intercept': float(round(lifestyle_lr.intercept_[0], 6)),
        'scaler_mean': [float(round(m, 6)) for m in lifestyle_scaler.mean_],
        'scaler_scale': [float(round(s, 6)) for s in lifestyle_scaler.scale_]
    }
    print(f"  → Lifestyle LR fitted: {len(lifestyle_features)} features")

    # ─── 5. Train Late-Fusion Meta-Learner ───
    print("\n[5/8] Training Late-Fusion Meta-Learner with reliability weighting...")
    
    # Get branch probabilities for calibration and test sets
    p_c_cal = clinical_lr.predict_proba(X_c_cal_scaled)[:, 1]
    p_l_cal = lifestyle_lr.predict_proba(X_l_cal_scaled)[:, 1]
    p_c_test = clinical_lr.predict_proba(X_c_test_scaled)[:, 1]
    p_l_test = lifestyle_lr.predict_proba(X_l_test_scaled)[:, 1]

    # Also get training branch probabilities (using out-of-fold to avoid leakage)
    from sklearn.model_selection import StratifiedKFold
    oof_p_c = np.zeros(len(y_train))
    oof_p_l = np.zeros(len(y_train))
    kf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    for fold_train_idx, fold_val_idx in kf.split(X_c_train_scaled, y_train):
        # Clinical fold
        fold_clf_c = LogisticRegression(C=0.1, max_iter=2000, random_state=42)
        fold_clf_c.fit(X_c_train_scaled[fold_train_idx], y_train.iloc[fold_train_idx] if hasattr(y_train, 'iloc') else y_train[fold_train_idx])
        oof_p_c[fold_val_idx] = fold_clf_c.predict_proba(X_c_train_scaled[fold_val_idx])[:, 1]
        
        # Lifestyle fold
        fold_clf_l = LogisticRegression(C=0.1, max_iter=2000, random_state=42)
        fold_clf_l.fit(X_l_train_scaled[fold_train_idx], y_train.iloc[fold_train_idx] if hasattr(y_train, 'iloc') else y_train[fold_train_idx])
        oof_p_l[fold_val_idx] = fold_clf_l.predict_proba(X_l_train_scaled[fold_val_idx])[:, 1]

    # Build meta features
    r_train_np = r_train.to_numpy() if hasattr(r_train, 'to_numpy') else np.array(r_train)
    r_cal_np = r_cal.to_numpy() if hasattr(r_cal, 'to_numpy') else np.array(r_cal)
    r_test_np = r_test.to_numpy() if hasattr(r_test, 'to_numpy') else np.array(r_test)
    y_train_np = y_train.to_numpy() if hasattr(y_train, 'to_numpy') else np.array(y_train)
    y_cal_np = y_cal.to_numpy() if hasattr(y_cal, 'to_numpy') else np.array(y_cal)
    y_test_np = y_test.to_numpy() if hasattr(y_test, 'to_numpy') else np.array(y_test)

    def make_meta_features(p_c, p_l, r):
        r = r.reshape(-1) if hasattr(r, 'reshape') else np.array(r).reshape(-1)
        p_c = np.array(p_c).reshape(-1)
        p_l = np.array(p_l).reshape(-1)
        return np.column_stack([p_c, p_l, r, p_l * r, (p_c - p_l) * r])

    meta_X_train = make_meta_features(oof_p_c, oof_p_l, r_train_np)
    meta_scaler = StandardScaler()
    meta_X_train_scaled = meta_scaler.fit_transform(meta_X_train)

    meta_learner = LogisticRegression(C=1.0, max_iter=2000, random_state=42)
    meta_learner.fit(meta_X_train_scaled, y_train_np)

    meta_weights = {
        'coefficients': [float(round(c, 6)) for c in meta_learner.coef_[0]],
        'intercept': float(round(meta_learner.intercept_[0], 6)),
        'feature_names': ['p_clinical', 'p_lifestyle', 'reliability_r', 'lifestyle_x_r', 'diff_x_r'],
        'scaler_mean': [float(round(m, 6)) for m in meta_scaler.mean_],
        'scaler_scale': [float(round(s, 6)) for s in meta_scaler.scale_]
    }

    # Get fused predictions on calibration and test sets
    meta_X_cal = make_meta_features(p_c_cal, p_l_cal, r_cal_np)
    meta_X_test = make_meta_features(p_c_test, p_l_test, r_test_np)
    
    prob_cal = meta_learner.predict_proba(meta_scaler.transform(meta_X_cal))[:, 1]
    prob_test = meta_learner.predict_proba(meta_scaler.transform(meta_X_test))[:, 1]
    pred_test = (prob_test >= 0.5).astype(int)

    print(f"  → Meta-learner weights: {meta_weights['coefficients']}")
    print(f"  → Meta-learner intercept: {meta_weights['intercept']}")

    # ─── 6. Calibrate Conformal Prediction on held-out calibration set ───
    print("\n[6/8] Calibrating conformal prediction quantile on calibration set...")
    conformal = InductiveConformalCalibrator(alpha=0.05)
    conformal.calibrate(y_cal_np, prob_cal)
    conformal_quantile = float(round(conformal.q_val, 6))
    print(f"  → Calibrated 95% conformal quantile: {conformal_quantile}")

    # Also calibrate at alpha=0.10
    conformal_90 = InductiveConformalCalibrator(alpha=0.10)
    conformal_90.calibrate(y_cal_np, prob_cal)
    conformal_quantile_90 = float(round(conformal_90.q_val, 6))
    print(f"  → Calibrated 90% conformal quantile: {conformal_quantile_90}")

    # ─── 7. Compute real baseline distribution for drift detection ───
    print("\n[7/8] Computing baseline risk distribution for drift monitoring...")
    prob_train_full = meta_learner.predict_proba(
        meta_scaler.transform(make_meta_features(
            clinical_lr.predict_proba(X_c_train_scaled)[:, 1],
            lifestyle_lr.predict_proba(X_l_train_scaled)[:, 1],
            r_train_np
        ))
    )[:, 1]

    baseline_deciles = []
    for i in range(10):
        lo = i * 0.1
        hi = (i + 1) * 0.1
        count = np.sum((prob_train_full >= lo) & (prob_train_full < hi))
        baseline_deciles.append(float(round(count / len(prob_train_full), 4)))
    
    baseline_stats = {
        'mean_risk': float(round(np.mean(prob_train_full), 4)),
        'std_risk': float(round(np.std(prob_train_full), 4)),
        'decile_proportions': baseline_deciles,
        'cohort_size': len(prob_train_full)
    }
    print(f"  → Baseline mean risk: {baseline_stats['mean_risk']}")
    print(f"  → Baseline deciles: {baseline_deciles}")

    # ─── 8. Compute SHAP-style feature importance from real model ───
    print("\n[8/8] Computing real feature attributions...")
    
    # For LR models, the real contribution of feature j to a prediction is:
    # contribution_j = coef_j * scaled_value_j
    # This is actually an exact additive attribution (equivalent to SHAP for linear models)
    
    # Compute population mean contributions as "base values"
    base_value_clinical = float(round(
        1.0 / (1.0 + np.exp(-(clinical_lr.intercept_[0] + np.dot(clinical_lr.coef_[0], np.zeros(len(clinical_features)))))),
        4
    ))
    base_value_fused = float(round(np.mean(prob_train_full), 4))
    
    # Mean absolute contribution for each clinical feature
    clinical_importances = []
    for i, feat in enumerate(clinical_features):
        abs_contrib = float(round(np.mean(np.abs(clinical_lr.coef_[0][i] * X_c_train_scaled[:, i])), 6))
        clinical_importances.append({
            'feature': feat,
            'mean_abs_importance': abs_contrib,
            'coefficient': float(round(clinical_lr.coef_[0][i], 6)),
            'scaler_mean': float(round(clinical_scaler.mean_[i], 4)),
            'scaler_scale': float(round(clinical_scaler.scale_[i], 4))
        })
    clinical_importances.sort(key=lambda x: x['mean_abs_importance'], reverse=True)

    lifestyle_importances = []
    for i, feat in enumerate(lifestyle_features):
        abs_contrib = float(round(np.mean(np.abs(lifestyle_lr.coef_[0][i] * X_l_train_scaled[:, i])), 6))
        lifestyle_importances.append({
            'feature': feat,
            'mean_abs_importance': abs_contrib,
            'coefficient': float(round(lifestyle_lr.coef_[0][i], 6)),
            'scaler_mean': float(round(lifestyle_scaler.mean_[i], 4)),
            'scaler_scale': float(round(lifestyle_scaler.scale_[i], 4))
        })
    lifestyle_importances.sort(key=lambda x: x['mean_abs_importance'], reverse=True)

    # ─── Benchmarks ───
    print("\n[BENCHMARKS] Computing full benchmark suite...")
    
    # B0: Framingham
    pred_b0, prob_b0 = compute_framingham_baseline(test_df)
    bench_b0 = compute_metrics(y_test_np, pred_b0, prob_b0)
    
    # B1: Clinical Only (RF)
    clf_b1 = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    clf_b1.fit(X_c_train.to_numpy(), y_train_np)
    prob_b1 = clf_b1.predict_proba(X_c_test.to_numpy())[:, 1]
    pred_b1 = (prob_b1 >= 0.5).astype(int)
    bench_b1 = compute_metrics(y_test_np, pred_b1, prob_b1)
    
    # B2: Early Fusion (RF)
    xai_features = [c for c in ALL_FEATURE_COLS if c in train_df.columns]
    clf_b2 = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    clf_b2.fit(X_early_train[xai_features].to_numpy(), y_train_np)
    prob_b2 = clf_b2.predict_proba(X_early_test[xai_features].to_numpy())[:, 1]
    pred_b2 = (prob_b2 >= 0.5).astype(int)
    bench_b2 = compute_metrics(y_test_np, pred_b2, prob_b2)
    
    # B3: Proposed Late Fusion (this model)
    bench_b3 = compute_metrics(y_test_np, pred_test, prob_test)

    # Fairness audit on test set
    fairness_audit = audit_subgroup_fairness(test_df, y_test_np, pred_test, prob_test)

    # DeLong tests
    delong_b2_b3 = delong_roc_test(y_test_np, prob_b2, prob_test)
    ci_b3 = bootstrap_confidence_intervals(y_test_np, pred_test, prob_test, n_bootstraps=500)

    # B7: Diabetes transferability
    print("  Training B7 (Diabetes transferability)...")
    diab_df = load_brfss_diabetes_dataset(max_records=25000)
    diab_train, diab_test = train_test_split(
        diab_df, test_size=0.25, stratify=diab_df['diabetes'], random_state=42
    )
    diab_all_cols = [c for c in diab_df.columns if c != 'diabetes']
    clf_diab = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    clf_diab.fit(diab_train[diab_all_cols].to_numpy(), diab_train['diabetes'].to_numpy())
    prob_diab = clf_diab.predict_proba(diab_test[diab_all_cols].to_numpy())[:, 1]
    pred_diab = (prob_diab >= 0.5).astype(int)
    bench_b7 = compute_metrics(diab_test['diabetes'].to_numpy(), pred_diab, prob_diab)

    # ─── XAI sample patient ───
    sample_idx = 14
    sample_patient_clinical = X_c_test_scaled[sample_idx]
    sample_patient_lifestyle = X_l_test_scaled[sample_idx]
    
    sample_shap_clinical = []
    for i, feat in enumerate(clinical_features):
        contrib = float(round(clinical_lr.coef_[0][i] * sample_patient_clinical[i], 6))
        sample_shap_clinical.append({
            'feature': feat,
            'patient_value': float(round(X_c_test[clinical_features].iloc[sample_idx].iloc[i], 2)),
            'shap_value': contrib,
            'impact': 'Increases Risk' if contrib >= 0 else 'Decreases Risk'
        })
    sample_shap_clinical.sort(key=lambda x: abs(x['shap_value']), reverse=True)

    sample_p_c = float(clinical_lr.predict_proba(sample_patient_clinical.reshape(1, -1))[0, 1])
    sample_p_l = float(lifestyle_lr.predict_proba(sample_patient_lifestyle.reshape(1, -1))[0, 1])

    # ─── Build comprehensive export ───
    export = {
        'metadata': {
            'title': 'CardioXAI Late-Fusion Model Artifacts',
            'author': 'Sarjan Bahadur Thapa',
            'student_id': '260043443',
            'institution': 'York St John University',
            'dataset_cohort_size': len(df),
            'train_size': len(train_df),
            'calibration_size': len(cal_df),
            'test_cohort_size': len(test_df),
            'data_provenance': 'Authentic Kaggle CVD (70k records) + CDC BRFSS Diabetes (70k records)',
            'cleaning_audit': cleaning_meta,
            'export_version': '2.0',
            'timestamp': '2026-11-07'
        },
        'clinical_branch': clinical_coefs,
        'lifestyle_branch': lifestyle_coefs,
        'fusion_model_parameters': meta_weights,
        'conformal_calibration': {
            'alpha_005': {
                'coverage': 0.95,
                'quantile': conformal_quantile,
                'calibration_set_size': len(cal_df)
            },
            'alpha_010': {
                'coverage': 0.90,
                'quantile': conformal_quantile_90,
                'calibration_set_size': len(cal_df)
            }
        },
        'baseline_distribution': baseline_stats,
        'global_feature_importances': {
            'clinical': clinical_importances,
            'lifestyle': lifestyle_importances,
            'base_value_clinical': base_value_clinical,
            'base_value_fused': base_value_fused
        },
        'benchmarks': {
            'B0_Framingham': {'name': 'B0: Framingham Clinical Baseline', 'type': 'Heuristic', **bench_b0},
            'B1_Clinical_Only': {'name': 'B1: Clinical-Only Model (RF)', 'type': 'Clinical Only', **bench_b1},
            'B2_Early_Fusion': {'name': 'B2: Early Fusion (RF)', 'type': 'Naive Integration', **bench_b2},
            'B3_Proposed_Late_Fusion': {
                'name': 'B3: Proposed Late Fusion (LR + Reliability)',
                'type': 'Proposed Architecture',
                **bench_b3,
                'meta_weights': {n: float(round(c, 4)) for n, c in zip(meta_weights['feature_names'], meta_weights['coefficients'])}
            },
            'B7_Diabetes_Transferability': {'name': 'B7: CDC BRFSS Diabetes Transfer', 'type': 'Transferability', **bench_b7}
        },
        'delong_tests': {
            'architecture_b2_vs_b3': delong_b2_b3
        },
        'confidence_intervals_b3': ci_b3,
        'fairness_audit': fairness_audit,
        'sample_patient_xai': {
            'shap': {
                'predicted_risk': float(round(prob_test[sample_idx], 4)),
                'base_value': base_value_fused,
                'attributions': sample_shap_clinical
            }
        }
    }

    # Save
    output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'ml_export.json')
    with open(output_path, 'w') as f:
        json.dump(export, f, indent=2)
    print(f"\n[SUCCESS] Enhanced model artifacts exported to: {output_path}")
    
    # Also save to ml_pipeline/
    ml_path = os.path.join(os.path.dirname(__file__), '..', 'ml_pipeline', 'ml_export.json')
    with open(ml_path, 'w') as f:
        json.dump(export, f, indent=2)
    print(f"[SUCCESS] Backup copy saved to: {ml_path}")

    print(f"\n  Test ROC-AUC (B3 Late Fusion): {bench_b3['roc_auc']}")
    print(f"  Conformal 95% quantile: {conformal_quantile}")
    print(f"  Fairness disparities detected: {fairness_audit.get('disparities_detected', 'N/A')}")
    print("=" * 75)


if __name__ == '__main__':
    run_enhanced_export()
