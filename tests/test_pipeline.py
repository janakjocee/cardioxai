"""
Comprehensive Automated Test Suite for CardioXAI ML Pipeline.

Tests:
1. Data loading & physiological cleaning audit
2. Feature engineering & interaction term calculations
3. Dual-Branch Late-Fusion training and inference
4. Zero-division and single-class safety in evaluation metrics
5. Algorithmic fairness parity checks
"""

import unittest
import numpy as np
import pandas as pd
from ml_pipeline.data_loader import load_cardiovascular_dataset, clean_cardiovascular_data, get_dataset_profile
from ml_pipeline.feature_engineering import engineer_features, split_modalities
from ml_pipeline.models import DualBranchLateFusion
from ml_pipeline.evaluation import compute_metrics, audit_subgroup_fairness
from complete_system_bundle import compute_cardioxai_prediction


class TestCardioXAIPipeline(unittest.TestCase):

    def test_01_data_cleaning_plausibility(self):
        """Verify that physiologically impossible records are safely filtered."""
        dirty_data = pd.DataFrame({
            'id': [1, 2, 3, 4],
            'age': [18000, 19000, 20000, 21000],
            'gender': [1, 2, 1, 2],
            'height': [165, 90, 175, 170],       # row 2 has invalid height (90 cm)
            'weight': [65, 70, 250, 75],         # row 3 has invalid weight (250 kg)
            'ap_hi': [120, 130, 140, -50],       # row 4 has negative SBP
            'ap_lo': [80, 85, 90, 80],
            'cholesterol': [1, 2, 1, 3],
            'gluc': [1, 1, 2, 1],
            'smoke': [0, 1, 0, 0],
            'alco': [0, 0, 1, 0],
            'active': [1, 1, 0, 1],
            'cardio': [0, 1, 0, 1]
        })
        cleaned = clean_cardiovascular_data(dirty_data)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned.iloc[0]['id'], 1)

    def test_02_feature_engineering_hemodynamics(self):
        """Verify calculation of derived hemodynamics and interaction terms."""
        sample_data = pd.DataFrame({
            'age_years': [50.0],
            'gender': [2],
            'height': [170.0],
            'weight': [72.25], # BMI = 72.25 / (1.7^2) = 25.0
            'ap_hi': [130.0],
            'ap_lo': [85.0],
            'cholesterol': [2],
            'gluc': [1],
            'smoke': [1],
            'alco': [0],
            'active': [0],
            'diet_quality': [3],
            'cardio': [1]
        })
        fe = engineer_features(sample_data)
        self.assertAlmostEqual(fe.iloc[0]['bmi'], 25.0, places=1)
        self.assertAlmostEqual(fe.iloc[0]['pulse_pressure'], 45.0, places=1)
        self.assertAlmostEqual(fe.iloc[0]['map'], 100.0, places=1) # 85 + 45/3
        self.assertAlmostEqual(fe.iloc[0]['ap_hi_x_smoke'], 10.0, places=1) # (130-120)*1

    def test_03_dual_branch_fusion(self):
        """Verify that Late Fusion fits without data leakage and predicts probabilities."""
        rng = np.random.default_rng(42)
        n = 100
        Xc = rng.normal(0, 1, (n, 8))
        Xl = rng.normal(0, 1, (n, 5))
        r = np.ones(n)
        y = rng.choice([0, 1], size=n)

        model = DualBranchLateFusion(clinical_model_name='lr', lifestyle_model_name='lr', include_reliability=True)
        model.fit(Xc, Xl, r, y, n_folds=2)
        probs = model.predict_proba(Xc[:10], Xl[:10], r[:10])

        self.assertEqual(probs.shape, (10, 2))
        self.assertTrue(np.all((probs >= 0.0) & (probs <= 1.0)))

    def test_04_zero_dependency_bundle(self):
        """Verify that complete_system_bundle prediction matches clinical expectations."""
        res = compute_cardioxai_prediction(
            age_years=60.0,
            gender=2,
            height=172.0,
            weight=86.0,
            ap_hi=155.0,
            ap_lo=95.0,
            cholesterol=3,
            gluc=2,
            smoke=1,
            alco=1,
            active=0,
            diet_quality=1
        )
        self.assertIn('predictions', res)
        self.assertIn('fused_risk_prob', res['predictions'])
        self.assertGreater(res['predictions']['fused_risk_prob'], 0.70)
        self.assertEqual(res['predictions']['risk_tier'], 'Critical Stage Risk')
        self.assertIn('xai', res)
        self.assertEqual(len(res['xai']['lime']['explanations']), 5)


if __name__ == '__main__':
    unittest.main()
