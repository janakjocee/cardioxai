export interface PatientInput {
  age_years: number;
  gender: 1 | 2;               // 1: Female, 2: Male
  height: number;              // cm
  weight: number;              // kg
  ap_hi: number;               // systolic BP mmHg
  ap_lo: number;               // diastolic BP mmHg
  cholesterol: 1 | 2 | 3;     // 1:Normal 2:AboveNormal 3:WellAbove
  gluc: 1 | 2 | 3;            // 1:Normal 2:AboveNormal 3:WellAbove
  smoke: 0 | 1;
  alco: 0 | 1;
  active: 0 | 1;
  diet_quality: 1 | 2 | 3 | 4 | 5;
  consistency_flag?: boolean;
}

export interface ShapAttribution {
  feature: string;
  patient_value: number;
  shap_value: number;
  impact: 'Increases Risk' | 'Decreases Risk';
}

export interface LimeExplanation {
  feature: string;
  patient_value: number;
  lime_weight: number;
  is_modifiable: boolean;
  clinical_guidance: string;
}

export interface AgreementMetrics {
  jaccard_overlap: number;
  sign_agreement_rate: number;
  spearman_rank_correlation: number;
  clinical_trust_verdict: string;
}

export interface PredictionResult {
  predictions: {
    clinical_branch_probability: number;
    lifestyle_branch_probability: number;
    lifestyle_reliability_score: number;
    fused_probability: number;
    risk_tier: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Stage Risk';
    risk_color: 'emerald' | 'blue' | 'amber' | 'red';
    clinical_action: string;
  };
  features: {
    bmi: number;
    pulse_pressure: number;
    map: number;
    interactions: {
      bmi_x_active: number;
      ap_hi_x_smoke: number;
      alco_x_gluc: number;
      age_x_ap_hi: number;
    };
  };
  xai: {
    shap: {
      base_value: number;
      attributions: ShapAttribution[];
    };
    lime: {
      explanations: LimeExplanation[];
    };
    agreement: AgreementMetrics;
  };
}

export interface BenchmarkEntry {
  name: string;
  type: string;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1_score: number;
  roc_auc: number;
  brier_score: number;
  meta_weights?: Record<string, number>;
}

export interface BenchmarkData {
  metadata: {
    title: string;
    author: string;
    student_id: string;
    institution: string;
    dataset_cohort_size: number;
    test_cohort_size: number;
    timestamp: string;
  };
  benchmarks: Record<string, BenchmarkEntry>;
  algo_comparison: Record<string, { accuracy: number; recall: number; precision: number; f1_score: number; roc_auc: number; brier_score: number; }>;
  delong_tests: {
    confirmatory_b1_vs_b2: { auc_model_a: number; auc_model_b: number; auc_difference: number; z_statistic: number; p_value: number; statistically_significant: boolean; };
    architecture_b2_vs_b3: { auc_model_a: number; auc_model_b: number; auc_difference: number; z_statistic: number; p_value: number; statistically_significant: boolean; };
  };
  confidence_intervals_b3: {
    roc_auc_ci: [number, number];
    accuracy_ci: [number, number];
    recall_ci: [number, number];
  };
  global_feature_importances: Array<{ feature: string; mean_abs_importance: number }>;
  sample_patient_xai: {
    shap: { predicted_risk: number; base_value: number; attributions: ShapAttribution[] };
    lime: { local_r2: number; explanations: LimeExplanation[] };
    agreement: AgreementMetrics;
  };
  fairness_audit: {
    pooled_recall: number;
    disparities_detected: boolean;
    subgroups: Record<string, {
      sample_size: number;
      accuracy: number;
      precision: number;
      recall: number;
      specificity: number;
      f1_score: number;
      roc_auc: number;
      brier_score: number;
      delta_recall_vs_pooled: number;
      parity_flag: boolean;
    }>;
  };
  fusion_model_parameters: {
    meta_weights: Record<string, number>;
    meta_intercept: number;
    scaler_mean: number[];
    scaler_scale: number[];
  };
}
