"""
Automated Test Suite for CardioXAI Real-Time Telemetry, FHIR Interoperability,
and Cryptographic Audit Trail Verification.
"""

import unittest
from ml_pipeline.stream_engine import RealTimeTelemetryEngine
from ml_pipeline.fhir_converter import fhir_bundle_to_feature_dict, create_fhir_risk_assessment_resource, LOINC
from ml_pipeline.audit_logger import CryptographicAuditLedger, GENESIS_HASH
from ml_pipeline.conformal import InductiveConformalCalibrator
import numpy as np


class TestCardioXAIRealTime(unittest.TestCase):

    def test_01_telemetry_sliding_hemodynamics(self):
        """Verify real-time hemodynamic sliding window calculations and rate pressure product."""
        engine = RealTimeTelemetryEngine(patient_age=55.0, patient_gender=2)
        r1 = engine.compute_instantaneous_risk(sbp=140.0, dbp=90.0, hr=80.0)

        # Pulse pressure = 140 - 90 = 50
        self.assertEqual(r1['vitals']['pulse_pressure'], 50.0)
        # MAP = 90 + 50/3 = 106.7
        self.assertAlmostEqual(r1['vitals']['map'], 106.7, places=1)
        # RPP = 80 * 140 / 100 = 112
        self.assertEqual(r1['vitals']['rpp'], 112.0)
        # Reliability should be 1.0 under pristine sensor quality
        self.assertEqual(r1['reliability_score'], 1.0)

    def test_02_sensor_degradation_reliability_decay(self):
        """Verify that sensor movement artifact down-weights reliability score r in real-time."""
        engine = RealTimeTelemetryEngine(patient_age=55.0, patient_gender=2)
        # Low sensor quality (0.35)
        r_noisy = engine.compute_instantaneous_risk(sbp=145.0, dbp=92.0, hr=85.0, sensor_quality=0.35)
        self.assertLessEqual(r_noisy['reliability_score'], 0.65)

    def test_03_fhir_r4_bundle_parsing(self):
        """Verify parsing of standard FHIR R4 Bundle with LOINC codes."""
        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {
                    "resource": {
                        "resourceType": "Patient",
                        "id": "NHS-TEST-999",
                        "gender": "female",
                        "birthDate": "1975-01-01"
                    }
                },
                {
                    "resource": {
                        "resourceType": "Observation",
                        "code": {"coding": [{"system": "http://loinc.org", "code": LOINC['SYSTOLIC_BP']}]},
                        "valueQuantity": {"value": 152, "unit": "mmHg"}
                    }
                },
                {
                    "resource": {
                        "resourceType": "Observation",
                        "code": {"coding": [{"system": "http://loinc.org", "code": LOINC['DIASTOLIC_BP']}]},
                        "valueQuantity": {"value": 96, "unit": "mmHg"}
                    }
                },
                {
                    "resource": {
                        "resourceType": "Observation",
                        "code": {"coding": [{"system": "http://loinc.org", "code": LOINC['TOBACCO_SMOKING']}]},
                        "valueCodeableConcept": {"text": "Smoker"}
                    }
                }
            ]
        }
        feats, prov = fhir_bundle_to_feature_dict(bundle)
        self.assertEqual(prov['patient_id'], 'NHS-TEST-999')
        self.assertEqual(feats['gender'], 1) # Female
        self.assertEqual(feats['ap_hi'], 152.0)
        self.assertEqual(feats['ap_lo'], 96.0)
        self.assertEqual(feats['smoke'], 1)

    def test_04_fhir_risk_assessment_emission(self):
        """Verify standard FHIR RiskAssessment resource generation."""
        resource = create_fhir_risk_assessment_resource(
            patient_id='NHS-TEST-999',
            fused_probability=0.884,
            risk_tier='Critical Stage Risk',
            clinical_action='Urgent evaluation',
            clinical_branch_prob=0.89,
            lifestyle_branch_prob=0.82,
            reliability_score=1.0
        )
        self.assertEqual(resource['resourceType'], 'RiskAssessment')
        self.assertEqual(resource['prediction'][0]['probabilityDecimal'], 0.884)
        self.assertEqual(resource['prediction'][0]['qualitativeRisk']['coding'][0]['code'], 'critical')

    def test_05_cryptographic_audit_chain_tamper_detection(self):
        """Verify that SHA-256 Merkle chain validates intact ledger and flags any data tampering."""
        ledger = CryptographicAuditLedger()
        b1 = ledger.record_decision(
            patient_ref='PAT-001',
            clinician_ref='DR-A',
            channel='ambulatory',
            input_payload={'sbp': 140, 'dbp': 90},
            prediction_summary={'risk': 0.65}
        )
        b2 = ledger.record_decision(
            patient_ref='PAT-002',
            clinician_ref='DR-B',
            channel='icu',
            input_payload={'sbp': 160, 'dbp': 100},
            prediction_summary={'risk': 0.88}
        )

        valid, err = ledger.verify_integrity()
        self.assertTrue(valid)
        self.assertIsNone(err)

        # Simulate adversarial tamper on Block 1 input
        b1.input_payload['sbp'] = 110
        valid_tampered, err_tampered = ledger.verify_integrity()
        self.assertFalse(valid_tampered)
        self.assertIn('tampering', err_tampered.lower())

    def test_06_conformal_calibrator_finite_sample_coverage(self):
        """Verify inductive conformal calibrator computes valid 95% confidence intervals."""
        calibrator = InductiveConformalCalibrator(alpha=0.05)
        # Mock calibration on 100 samples
        y_true = np.array([1, 0, 1, 1, 0, 1, 0, 0, 1, 0] * 10)
        y_prob = np.array([0.9, 0.1, 0.8, 0.7, 0.2, 0.85, 0.15, 0.05, 0.95, 0.1] * 10)
        calibrator.calibrate(y_true, y_prob)

        res = calibrator.predict_interval(p_fused=0.65, reliability_r=1.0, pulse_pressure=45.0)
        self.assertLessEqual(res['lower_bound'], 0.65)
        self.assertGreaterEqual(res['upper_bound'], 0.65)
        self.assertEqual(res['alpha'], 0.05)
        self.assertEqual(res['coverage'], 0.95)

    def test_07_conformal_uncertainty_expansion_on_sensor_decay(self):
        """Verify that degraded reliability expands epistemic uncertainty interval width."""
        calibrator = InductiveConformalCalibrator(alpha=0.05)
        r_pristine = calibrator.predict_interval(p_fused=0.50, reliability_r=1.0, pulse_pressure=40.0)
        r_degraded = calibrator.predict_interval(p_fused=0.50, reliability_r=0.4, pulse_pressure=80.0)

        self.assertGreater(r_degraded['interval_width'], r_pristine['interval_width'])
        self.assertIn(r_degraded['certainty_tier'], ['MODERATE_CERTAINTY', 'EPISTEMIC_AMBIGUITY'])


if __name__ == '__main__':
    unittest.main()
