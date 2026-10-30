"""
HL7 FHIR Release 4 Converter and LOINC Mapper for CardioXAI.

Provides bidirectional translation between standard hospital FHIR R4 Bundles
and the NumPy / Pandas feature vectors required by the Dual-Branch Late-Fusion model.
"""

from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

LOINC = {
    'BP_PANEL': '85354-9',
    'SYSTOLIC_BP': '8480-6',
    'DIASTOLIC_BP': '8462-4',
    'HEART_RATE': '8867-4',
    'BODY_WEIGHT': '29463-7',
    'BODY_HEIGHT': '8302-2',
    'BMI': '39156-5',
    'CHOL_TOTAL': '2093-3',
    'GLUCOSE': '2339-0',
    'TOBACCO_SMOKING': '72166-2',
    'ALCOHOL_INTAKE': '11331-6',
    'PHYSICAL_ACTIVITY': '55423-8',
    'DIET_SCORE': '89555-7',
    'CVD_RISK': '75492-9',
}


def fhir_bundle_to_feature_dict(bundle: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Parses a FHIR R4 bundle JSON object and produces patient input features and provenance metadata.
    """
    patient_data = {
        'age_years': 54.0,
        'gender': 2,        # 1: Female, 2: Male
        'height': 170.0,
        'weight': 75.0,
        'ap_hi': 125.0,
        'ap_lo': 80.0,
        'cholesterol': 1,   # 1, 2, 3
        'gluc': 1,          # 1, 2, 3
        'smoke': 0,
        'alco': 0,
        'active': 1,
        'diet_quality': 3,
        'heart_rate': 72.0
    }
    
    patient_id = "unknown-patient"
    patient_name = "Anonymous Patient"
    found_codes = []

    entries = bundle.get('entry', [])
    for entry in entries:
        res = entry.get('resource', {})
        res_type = res.get('resourceType')

        if res_type == 'Patient':
            patient_id = res.get('id', patient_id)
            names = res.get('name', [])
            if names:
                n = names[0]
                given = " ".join(n.get('given', []))
                family = n.get('family', '')
                patient_name = f"{given} {family}".strip() or patient_name
            
            birth_date_str = res.get('birthDate')
            if birth_date_str:
                try:
                    birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
                    age = (datetime.now() - birth_date).days / 365.25
                    if 10 < age < 115:
                        patient_data['age_years'] = round(age, 1)
                except ValueError:
                    pass
            
            gender = res.get('gender')
            if gender == 'female':
                patient_data['gender'] = 1
            elif gender == 'male':
                patient_data['gender'] = 2

        elif res_type == 'Observation':
            code_obj = res.get('code', {})
            codings = code_obj.get('coding', [])
            for c in codings:
                code = c.get('code')
                found_codes.append(code)

                # Blood Pressure Panel
                if code == LOINC['BP_PANEL']:
                    for comp in res.get('component', []):
                        comp_codes = [cc.get('code') for cc in comp.get('code', {}).get('coding', [])]
                        comp_val = comp.get('valueQuantity', {}).get('value')
                        if LOINC['SYSTOLIC_BP'] in comp_codes and comp_val is not None:
                            patient_data['ap_hi'] = float(comp_val)
                        if LOINC['DIASTOLIC_BP'] in comp_codes and comp_val is not None:
                            patient_data['ap_lo'] = float(comp_val)

                if code == LOINC['SYSTOLIC_BP']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        patient_data['ap_hi'] = float(v)

                if code == LOINC['DIASTOLIC_BP']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        patient_data['ap_lo'] = float(v)

                if code == LOINC['HEART_RATE']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        patient_data['heart_rate'] = float(v)

                if code == LOINC['BODY_HEIGHT']:
                    v = res.get('valueQuantity', {}).get('value')
                    unit = res.get('valueQuantity', {}).get('unit', 'cm')
                    if v is not None:
                        if unit in ['m', 'meter']:
                            v *= 100
                        patient_data['height'] = float(v)

                if code == LOINC['BODY_WEIGHT']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        patient_data['weight'] = round(float(v), 1)

                if code == LOINC['CHOL_TOTAL']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        val = float(v)
                        patient_data['cholesterol'] = 1 if val < 200 else (2 if val < 240 else 3)

                if code == LOINC['GLUCOSE']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        val = float(v)
                        patient_data['gluc'] = 1 if val < 100 else (2 if val < 126 else 3)

                if code == LOINC['TOBACCO_SMOKING']:
                    val_concept = res.get('valueCodeableConcept', {})
                    text = (val_concept.get('text', '') + " " + c.get('display', '')).lower()
                    codes = [sc.get('code') for sc in val_concept.get('coding', [])]
                    if 'smoker' in text or 'current' in text or '449868002' in codes:
                        patient_data['smoke'] = 1
                    else:
                        patient_data['smoke'] = 0

                if code == LOINC['PHYSICAL_ACTIVITY']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        patient_data['active'] = 1 if float(v) >= 5000 else 0

                if code == LOINC['DIET_SCORE']:
                    v = res.get('valueQuantity', {}).get('value')
                    if v is not None:
                        patient_data['diet_quality'] = max(1, min(5, int(round(float(v)))))

    provenance = {
        'patient_id': patient_id,
        'patient_name': patient_name,
        'observations_identified': list(set(found_codes)),
        'parsed_at': datetime.now(timezone.utc).isoformat()
    }

    return patient_data, provenance


def create_fhir_risk_assessment_resource(
    patient_id: str,
    fused_probability: float,
    risk_tier: str,
    clinical_action: str,
    clinical_branch_prob: float,
    lifestyle_branch_prob: float,
    reliability_score: float,
    top_explanations: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Constructs a standard HL7 FHIR R4 RiskAssessment resource dict.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    qualitative_map = {
        'Low Risk': 'low',
        'Moderate Risk': 'moderate',
        'High Risk': 'high',
        'Critical Stage Risk': 'critical'
    }

    top_str = ""
    if top_explanations:
        top_str = "; ".join([f"{item.get('feature', '')}: {item.get('clinical_guidance', '')}" for item in top_explanations[:3]])

    return {
        "resourceType": "RiskAssessment",
        "id": f"cardioxai-{int(datetime.now(timezone.utc).timestamp())}",
        "status": "final",
        "subject": {
            "reference": f"Patient/{patient_id}",
            "display": f"Patient ID {patient_id}"
        },
        "occurrenceDateTime": now_iso,
        "condition": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "49436004",
                    "display": "At risk for cardiovascular disease (finding)"
                }
            ]
        },
        "prediction": [
            {
                "outcome": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "42343007",
                            "display": "Congestive heart failure or atherosclerotic cardiovascular event"
                        }
                    ],
                    "text": "Cardiovascular Disease Event Risk"
                },
                "probabilityDecimal": round(fused_probability, 4),
                "qualitativeRisk": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/risk-probability",
                            "code": qualitative_map.get(risk_tier, 'moderate'),
                            "display": risk_tier
                        }
                    ],
                    "text": risk_tier
                },
                "rationale": (
                    f"Late-Fusion CDS. Clinical branch: {clinical_branch_prob*100:.1f}%; "
                    f"Lifestyle branch: {lifestyle_branch_prob*100:.1f}%; "
                    f"Reliability: {reliability_score*100:.0f}%. Action: {clinical_action}"
                )
            }
        ],
        "note": [
            {"text": f"Top Modifiable Targets (LIME): {top_str}" if top_str else "Assessed via CardioXAI."},
            {"text": "CardioXAI Assistive Clinical Decision Support (Sarjan B. Thapa, York St John University)"}
        ]
    }
