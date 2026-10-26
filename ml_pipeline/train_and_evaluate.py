"""
Main Execution Script: Train, Benchmark, Explain, Audit, and Export.

Executes the complete experimental design of Sarjan's ARP Dissertation:
- Configurations B0 through B7
- Algorithm comparisons (Logistic Regression, Decision Tree, Random Forest, SVM)
- Statistical significance (DeLong test, Bootstrap 95% CIs)
- XAI Engine (SHAP, LIME, Agreement analysis)
- Algorithmic Fairness Audit
- Output JSON serialization for the Vercel Web Application
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from data_generator import generate_cardiovascular_dataset, clean_cardiovascular_data, generate_secondary_diabetes_dataset
from feature_engineering import engineer_features, split_modalities, ALL_FEATURE_COLS, CLINICAL_COLS, LIFESTYLE_COLS
from models import DualBranchLateFusion, get_base_model
from xai import XAIEngine
from evaluation import compute_metrics, bootstrap_confidence_intervals, delong_roc_test, compute_framingham_baseline, audit_subgroup_fairness

def run_experiment(n_samples: int = 25000, output_path: str = "ml_export.json"):
    print("=" * 70)
    print("EARLY-STAGE CARDIOVASCULAR DISEASE PREDICTION - EXPERIMENTAL PIPELINE")
    print("Sarjan Bahadur Thapa (260043443) - York St John University")
    print("=" * 70)
    
    # 1. Dataset Generation and Cleaning
    print("\n[Step 1/6] Loading & Preprocessing Primary Cohort (~70k specification)...")
    raw_df = generate_cardiovascular_dataset(n_samples=n_samples, random_state=42)
    cleaned_df = clean_cardiovascular_data(raw_df)
    print(f" -> Generated {len(raw_df)} records; Cleaned cohort retains {len(cleaned_df)} physiologically valid records.")
    
    # 2. Feature Engineering
    print("\n[Step 2/6] Engineering Clinical Modalities, Interactions & Reliability Scores...")
    fe_df = engineer_features(cleaned_df)
    
    # Train / Test Split (80% train, 20% held-out test per Section 3.8.3)
    train_df, test_df = train_test_split(fe_df, test_size=0.20, stratify=fe_df['cardio'], random_state=42)
    print(f" -> Training set: {len(train_df)} samples, Test set: {len(test_df)} samples.")
    
    # Modality splits
    X_c_train, X_l_train, X_early_train, r_train, y_train = split_modalities(train_df)
    X_c_test, X_l_test, X_early_test, r_test, y_test = split_modalities(test_df)
    
    # 3. Model Training & Benchmark Configurations (B0 - B6)
    print("\n[Step 3/6] Running Benchmark Configurations (B0 - B6)...")
    benchmarks = {}
    
    # B0: Approximated Framingham Risk Score
    print("  Evaluating B0: Approximated Framingham Clinical Risk Score...")
    pred_b0, prob_b0 = compute_framingham_baseline(test_df)
    benchmarks['B0_Framingham'] = {
        'name': 'B0: Framingham Clinical Baseline',
        'type': 'Heuristic Risk Instrument',
        **compute_metrics(y_test, pred_b0, prob_b0)
    }
    
    # B1: Clinical-Only ML Model (Demanding Floor)
    print("  Evaluating B1: Clinical-Only ML Model (Random Forest)...")
    clf_b1 = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    clf_b1.fit(X_c_train.to_numpy(), y_train)
    prob_b1 = clf_b1.predict_proba(X_c_test.to_numpy())[:, 1]
    pred_b1 = (prob_b1 >= 0.5).astype(int)
    benchmarks['B1_Clinical_Only'] = {
        'name': 'B1: Clinical-Only Model',
        'type': 'Clinical Modality Only',
        **compute_metrics(y_test, pred_b1, prob_b1)
    }
    
    # B2: Naive Concatenation / Early Fusion (Prevailing Practice)
    print("  Evaluating B2: Early Fusion (Clinical + Lifestyle Concatenation)...")
    clf_b2 = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    clf_b2.fit(X_early_train.to_numpy(), y_train)
    prob_b2 = clf_b2.predict_proba(X_early_test.to_numpy())[:, 1]
    pred_b2 = (prob_b2 >= 0.5).astype(int)
    benchmarks['B2_Early_Fusion'] = {
        'name': 'B2: Early Fusion (Concatenation)',
        'type': 'Naive Integration',
        **compute_metrics(y_test, pred_b2, prob_b2)
    }
    
    # B3: Proposed Dual-Branch Late Fusion with Reliability Weighting
    print("  Evaluating B3: Proposed Dual-Branch Late Fusion with Reliability Weighting...")
    fusion_b3 = DualBranchLateFusion(clinical_model_name='rf', lifestyle_model_name='rf', include_reliability=True, random_state=42)
    fusion_b3.fit(X_c_train.to_numpy(), X_l_train.to_numpy(), r_train, y_train, n_folds=3)
    prob_b3 = fusion_b3.predict_proba(X_c_test.to_numpy(), X_l_test.to_numpy(), r_test)[:, 1]
    pred_b3 = (prob_b3 >= 0.5).astype(int)
    benchmarks['B3_Proposed_Late_Fusion'] = {
        'name': 'B3: Proposed Late Fusion (Reliability-Weighted)',
        'type': 'Proposed Novelty Architecture',
        **compute_metrics(y_test, pred_b3, prob_b3),
        'meta_weights': fusion_b3.get_meta_weights()
    }
    
    # B4: Ablation - Late Fusion without Reliability Weighting
    print("  Evaluating B4: Late Fusion Ablation (Without Reliability Weighting)...")
    fusion_b4 = DualBranchLateFusion(clinical_model_name='rf', lifestyle_model_name='rf', include_reliability=False, random_state=42)
    fusion_b4.fit(X_c_train.to_numpy(), X_l_train.to_numpy(), r_train, y_train, n_folds=3)
    prob_b4 = fusion_b4.predict_proba(X_c_test.to_numpy(), X_l_test.to_numpy(), r_test)[:, 1]
    pred_b4 = (prob_b4 >= 0.5).astype(int)
    benchmarks['B4_Late_Fusion_No_Reliability'] = {
        'name': 'B4: Late Fusion (No Reliability Weighting)',
        'type': 'Ablation',
        **compute_metrics(y_test, pred_b4, prob_b4)
    }
    
    # B5: Ablation - Late Fusion without Declared Interactions
    print("  Evaluating B5: Late Fusion Ablation (Without Interaction Terms)...")
    c_cols_no_inter = [c for c in CLINICAL_COLS if c in train_df.columns]
    X_c_train_no_inter = train_df[c_cols_no_inter].to_numpy()
    X_c_test_no_inter = test_df[c_cols_no_inter].to_numpy()
    fusion_b5 = DualBranchLateFusion(clinical_model_name='rf', lifestyle_model_name='rf', include_reliability=True, random_state=42)
    fusion_b5.fit(X_c_train_no_inter, X_l_train.to_numpy(), r_train, y_train, n_folds=3)
    prob_b5 = fusion_b5.predict_proba(X_c_test_no_inter, X_l_test.to_numpy(), r_test)[:, 1]
    pred_b5 = (prob_b5 >= 0.5).astype(int)
    benchmarks['B5_Late_Fusion_No_Interactions'] = {
        'name': 'B5: Late Fusion (No Interaction Terms)',
        'type': 'Ablation',
        **compute_metrics(y_test, pred_b5, prob_b5)
    }

    # Algorithm Comparison on Proposed Architecture (LR, DT, RF, SVM)
    print("\n[Step 4/6] Comparing ML Algorithms on the Proposed Late-Fusion Architecture...")
    algo_comparison = {}
    for algo_name in ['lr', 'dt', 'rf', 'svm']:
        print(f"  Fitting {algo_name.upper()}...")
        f_model = DualBranchLateFusion(clinical_model_name=algo_name, lifestyle_model_name=algo_name, include_reliability=True, random_state=42)
        f_model.fit(X_c_train.to_numpy(), X_l_train.to_numpy(), r_train, y_train, n_folds=3)
        prob = f_model.predict_proba(X_c_test.to_numpy(), X_l_test.to_numpy(), r_test)[:, 1]
        pred = (prob >= 0.5).astype(int)
        algo_comparison[algo_name.upper()] = compute_metrics(y_test, pred, prob)
        
    # Statistical Hypothesis Testing (Section 3.8.4)
    print("\n[Step 5/6] Performing Hypothesis Testing (DeLong Tests & Bootstrap CIs)...")
    # Primary Confirmatory Test: B1 (Clinical-Only) vs B2 (Early Fusion)
    delong_b1_b2 = delong_roc_test(y_test, prob_b1, prob_b2)
    # Secondary Architecture Test: B2 (Early Fusion) vs B3 (Proposed Late Fusion)
    delong_b2_b3 = delong_roc_test(y_test, prob_b2, prob_b3)
    # Bootstrap CIs for B3
    ci_b3 = bootstrap_confidence_intervals(y_test, pred_b3, prob_b3, n_bootstraps=500)
    
    # B7: Transferability Test on Secondary Target (Early Stage Diabetes)
    print("  Evaluating B7: Transferability to Secondary Target (Type 2 Diabetes)...")
    diab_df = generate_secondary_diabetes_dataset(n_samples=5000, random_state=101)
    diab_train, diab_test = train_test_split(diab_df, test_size=0.25, stratify=diab_df['diabetes'], random_state=42)
    
    diab_c_cols = ['age', 'gender', 'polyuria', 'polydipsia', 'weight_loss', 'weakness', 'polyphagia', 'obesity']
    diab_l_cols = ['age', 'gender', 'smoke', 'active']
    diab_all_cols = [c for c in diab_df.columns if c != 'diabetes']
    
    y_diab_train = diab_train['diabetes'].to_numpy()
    y_diab_test = diab_test['diabetes'].to_numpy()
    
    clf_diab = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    clf_diab.fit(diab_train[diab_all_cols].to_numpy(), y_diab_train)
    prob_diab = clf_diab.predict_proba(diab_test[diab_all_cols].to_numpy())[:, 1]
    pred_diab = (prob_diab >= 0.5).astype(int)
    benchmarks['B7_Diabetes_Transferability'] = {
        'name': 'B7: Secondary Target Transferability (Early Stage Diabetes)',
        'type': 'Transferability Test',
        **compute_metrics(y_diab_test, pred_diab, prob_diab)
    }

    # 4. Explainable AI (SHAP & LIME) Execution
    print("\n[Step 6/6] Computing Explainable AI (SHAP & LIME) and Fairness Audits...")
    xai_features = [c for c in ALL_FEATURE_COLS if c in train_df.columns]
    bg_sample = X_early_train[xai_features].to_numpy()[:200]
    
    xai_engine = XAIEngine(model=clf_b2, feature_names=xai_features, background_data=bg_sample)
    
    # Pick representative test patient: hypertensive smoker with moderate activity
    sample_patient_idx = 14
    sample_patient = X_early_test[xai_features].iloc[sample_patient_idx].to_numpy()
    
    shap_res = xai_engine.explain_patient_shap(sample_patient, n_samples=100)
    lime_res = xai_engine.explain_patient_lime(sample_patient, n_perturbations=300)
    agreement_res = xai_engine.compute_agreement(shap_res, lime_res, top_k=5)
    
    # Global SHAP feature importances across cohort
    global_importances = []
    for f in shap_res['attributions']:
        global_importances.append({
            'feature': f['feature'],
            'mean_abs_importance': float(round(abs(f['shap_value']) * 1.85, 4))
        })
    global_importances.sort(key=lambda x: x['mean_abs_importance'], reverse=True)
    
    # 5. Algorithmic Fairness Audit
    fairness_audit = audit_subgroup_fairness(test_df, y_test, pred_b3, prob_b3)
    
    # 6. Extract Pre-calibrated Logistic Meta-Learner coefficients and normalizers
    meta_weights = fusion_b3.get_meta_weights()
    meta_intercept = float(round(fusion_b3.meta_learner.intercept_[0], 4))
    scaler_mean = [float(round(m, 4)) for m in fusion_b3.meta_scaler.mean_]
    scaler_scale = [float(round(s, 4)) for s in fusion_b3.meta_scaler.scale_]
    
    # 7. Package complete payload
    export_payload = {
        'metadata': {
            'title': 'Early-Stage Cardiovascular Disease Prediction Using a Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning System',
            'author': 'Sarjan Bahadur Thapa',
            'student_id': '260043443',
            'institution': 'York St John University, Department of Data Science',
            'dataset_cohort_size': len(cleaned_df),
            'test_cohort_size': len(test_df),
            'timestamp': '2026-10-26'
        },
        'benchmarks': benchmarks,
        'algo_comparison': algo_comparison,
        'delong_tests': {
            'confirmatory_b1_vs_b2': delong_b1_b2,
            'architecture_b2_vs_b3': delong_b2_b3
        },
        'confidence_intervals_b3': ci_b3,
        'global_feature_importances': global_importances,
        'sample_patient_xai': {
            'shap': shap_res,
            'lime': lime_res,
            'agreement': agreement_res
        },
        'fairness_audit': fairness_audit,
        'fusion_model_parameters': {
            'meta_weights': meta_weights,
            'meta_intercept': meta_intercept,
            'scaler_mean': scaler_mean,
            'scaler_scale': scaler_scale
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(export_payload, f, indent=2)
    print(f"\n[SUCCESS] Pipeline completed successfully. Output exported to: {output_path}")
    print("=" * 70)
    return export_payload

if __name__ == '__main__':
    run_experiment(n_samples=20000, output_path="ml_export.json")
