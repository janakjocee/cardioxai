/**
 * HL7 FHIR R4 Clinical Interoperability Engine for CardioXAI.
 * 
 * Standards Compliance:
 * - HL7 FHIR Release 4 (v4.0.1)
 * - LOINC (Logical Observation Identifiers Names and Codes)
 * - SNOMED-CT for Clinical Terminology
 * 
 * Maps bidirectional translations between standard EHR FHIR Bundles
 * and CardioXAI late-fusion feature vectors.
 */

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  [key: string]: any;
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  status: 'final' | 'preliminary' | 'amended';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject?: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  valueCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  component?: Array<{
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    valueQuantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }>;
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  type: 'collection' | 'transaction' | 'batch' | 'document';
  entry: Array<{
    fullUrl?: string;
    resource: FHIRResource;
  }>;
}

export interface FHIRRiskAssessment extends FHIRResource {
  resourceType: 'RiskAssessment';
  status: 'final' | 'preliminary';
  subject: {
    reference: string;
    display?: string;
  };
  occurrenceDateTime: string;
  condition?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  prediction: Array<{
    outcome: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    probabilityDecimal: number;
    qualitativeRisk?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    rationale?: string;
  }>;
  note?: Array<{
    text: string;
  }>;
}

// Canonical LOINC Codes for Cardiovascular & Behavioral Parameters
export const LOINC = {
  BP_PANEL: '85354-9',        // Blood pressure panel with all children optional
  SYSTOLIC_BP: '8480-6',      // Systolic blood pressure
  DIASTOLIC_BP: '8462-4',     // Diastolic blood pressure
  HEART_RATE: '8867-4',       // Heart rate
  BODY_WEIGHT: '29463-7',     // Body weight
  BODY_HEIGHT: '8302-2',      // Body height
  BMI: '39156-5',             // Body mass index (BMI) [Ratio]
  CHOL_TOTAL: '2093-3',       // Cholesterol [Mass/volume] in Serum or Plasma
  GLUCOSE: '2339-0',          // Glucose [Mass/volume] in Blood
  TOBACCO_SMOKING: '72166-2', // Tobacco smoking status
  ALCOHOL_INTAKE: '11331-6',  // History of Alcohol use
  PHYSICAL_ACTIVITY: '55423-8', // Number of steps in 24 hours (or active indicator)
  DIET_SCORE: '89555-7',      // Mediterranean Diet Adherence Score
  CVD_RISK: '75492-9',        // Cardiovascular disease 10Y risk score
};

/**
 * Parses an incoming FHIR R4 Bundle and extracts standardized patient input
 * for the CardioXAI Dual-Branch Late-Fusion Engine.
 */
export function parseFHIRBundleToPatientInput(bundle: FHIRBundle): {
  patient: {
    age_years: number;
    gender: 1 | 2;
    height: number;
    weight: number;
    ap_hi: number;
    ap_lo: number;
    cholesterol: 1 | 2 | 3;
    gluc: 1 | 2 | 3;
    smoke: 0 | 1;
    alco: 0 | 1;
    active: 0 | 1;
    diet_quality: 1 | 2 | 3 | 4 | 5;
    heart_rate?: number;
  };
  provenance: {
    patient_id: string;
    patient_name?: string;
    observations_found: string[];
    timestamp: string;
  };
} {
  const result = {
    age_years: 54,
    gender: 2 as 1 | 2,
    height: 170,
    weight: 75,
    ap_hi: 125,
    ap_lo: 80,
    cholesterol: 1 as 1 | 2 | 3,
    gluc: 1 as 1 | 2 | 3,
    smoke: 0 as 0 | 1,
    alco: 0 as 0 | 1,
    active: 1 as 0 | 1,
    diet_quality: 3 as 1 | 2 | 3 | 4 | 5,
    heart_rate: 72,
  };

  const observationsFound: string[] = [];
  let patientId = 'unknown-patient';
  let patientName = 'Anonymous Patient';

  if (!bundle || !Array.isArray(bundle.entry)) {
    return { patient: result, provenance: { patient_id: patientId, observations_found: [], timestamp: new Date().toISOString() } };
  }

  for (const entry of bundle.entry) {
    const res = entry.resource;
    if (!res) continue;

    // 1. Patient Demographics
    if (res.resourceType === 'Patient') {
      patientId = res.id || patientId;
      if (res.name && res.name[0]) {
        const n = res.name[0];
        patientName = `${n.given ? n.given.join(' ') : ''} ${n.family || ''}`.trim() || patientName;
      }
      if (res.birthDate) {
        const birth = new Date(res.birthDate);
        const diffMs = Date.now() - birth.getTime();
        const age = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
        if (age > 10 && age < 115) result.age_years = age;
      }
      if (res.gender === 'female') result.gender = 1;
      else if (res.gender === 'male') result.gender = 2;
    }

    // 2. Observations
    if (res.resourceType === 'Observation' && res.code && Array.isArray(res.code.coding)) {
      for (const coding of res.code.coding) {
        const code = coding.code;
        observationsFound.push(code);

        // Blood pressure panel (contains systolic & diastolic components)
        if (code === LOINC.BP_PANEL && Array.isArray(res.component)) {
          for (const comp of res.component) {
            const compCode = comp.code?.coding?.[0]?.code;
            const compVal = comp.valueQuantity?.value;
            if (compCode === LOINC.SYSTOLIC_BP && compVal) result.ap_hi = Math.round(compVal);
            if (compCode === LOINC.DIASTOLIC_BP && compVal) result.ap_lo = Math.round(compVal);
          }
        }

        // Direct Systolic
        if (code === LOINC.SYSTOLIC_BP && res.valueQuantity?.value) {
          result.ap_hi = Math.round(res.valueQuantity.value);
        }

        // Direct Diastolic
        if (code === LOINC.DIASTOLIC_BP && res.valueQuantity?.value) {
          result.ap_lo = Math.round(res.valueQuantity.value);
        }

        // Heart Rate
        if (code === LOINC.HEART_RATE && res.valueQuantity?.value) {
          result.heart_rate = Math.round(res.valueQuantity.value);
        }

        // Height
        if (code === LOINC.BODY_HEIGHT && res.valueQuantity?.value) {
          let val = res.valueQuantity.value;
          if (res.valueQuantity.unit === 'm' || res.valueQuantity.unit === 'meter') val *= 100;
          result.height = Math.round(val);
        }

        // Weight
        if (code === LOINC.BODY_WEIGHT && res.valueQuantity?.value) {
          result.weight = Math.round(res.valueQuantity.value * 10) / 10;
        }

        // Total Cholesterol
        if (code === LOINC.CHOL_TOTAL && res.valueQuantity?.value) {
          const mgdl = res.valueQuantity.value;
          if (mgdl < 200) result.cholesterol = 1;
          else if (mgdl < 240) result.cholesterol = 2;
          else result.cholesterol = 3;
        }

        // Fasting Blood Glucose
        if (code === LOINC.GLUCOSE && res.valueQuantity?.value) {
          const mgdl = res.valueQuantity.value;
          if (mgdl < 100) result.gluc = 1;
          else if (mgdl < 126) result.gluc = 2;
          else result.gluc = 3;
        }

        // Tobacco Smoking Status
        if (code === LOINC.TOBACCO_SMOKING) {
          const text = (res.valueCodeableConcept?.text || coding.display || '').toLowerCase();
          const codeVal = res.valueCodeableConcept?.coding?.[0]?.code || '';
          if (text.includes('current') || text.includes('smoker') || codeVal === '449868002') {
            result.smoke = 1;
          } else {
            result.smoke = 0;
          }
        }

        // Alcohol Intake
        if (code === LOINC.ALCOHOL_INTAKE) {
          const text = (res.valueCodeableConcept?.text || coding.display || '').toLowerCase();
          result.alco = (text.includes('yes') || text.includes('heavy') || text.includes('frequent')) ? 1 : 0;
        }

        // Physical Activity
        if (code === LOINC.PHYSICAL_ACTIVITY) {
          const val = res.valueQuantity?.value;
          if (val !== undefined) {
            result.active = val >= 5000 ? 1 : 0; // Steps threshold
          }
        }

        // Diet Score
        if (code === LOINC.DIET_SCORE && res.valueQuantity?.value) {
          result.diet_quality = Math.max(1, Math.min(5, Math.round(res.valueQuantity.value))) as 1 | 2 | 3 | 4 | 5;
        }
      }
    }
  }

  return {
    patient: result,
    provenance: {
      patient_id: patientId,
      patient_name: patientName,
      observations_found: Array.from(new Set(observationsFound)),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Creates a standard HL7 FHIR R4 RiskAssessment resource from CardioXAI prediction results.
 * Can be exported or posted directly into an EHR repository.
 */
export function createFHIRRiskAssessment(
  patientId: string,
  prediction: {
    fused_probability: number;
    risk_tier: string;
    clinical_action: string;
    clinical_branch_probability: number;
    lifestyle_branch_probability: number;
    lifestyle_reliability_score: number;
  },
  topDrivers: Array<{ feature: string; impact: string }>
): FHIRRiskAssessment {
  const qualitativeCodeMap: Record<string, string> = {
    'Low Risk': 'low',
    'Moderate Risk': 'moderate',
    'High Risk': 'high',
    'Critical Stage Risk': 'critical'
  };

  return {
    resourceType: 'RiskAssessment',
    id: `cardioxai-risk-${Date.now()}`,
    meta: {
      versionId: '1.0',
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/RiskAssessment']
    },
    status: 'final',
    subject: {
      reference: `Patient/${patientId}`,
      display: `Assessed Patient (ID: ${patientId})`
    },
    occurrenceDateTime: new Date().toISOString(),
    condition: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '49436004',
          display: 'At risk for cardiovascular disease (finding)'
        }
      ]
    },
    prediction: [
      {
        outcome: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '42343007',
              display: 'Congestive heart failure or atherosclerotic cardiovascular event'
            }
          ],
          text: '10-Year or Early-Stage Cardiovascular Disease Event'
        },
        probabilityDecimal: Math.round(prediction.fused_probability * 10000) / 10000,
        qualitativeRisk: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/risk-probability',
              code: qualitativeCodeMap[prediction.risk_tier] || 'moderate',
              display: prediction.risk_tier
            }
          ],
          text: prediction.risk_tier
        },
        rationale: `Dual-Branch Late-Fusion assessment. Clinical Branch Probability: ${(prediction.clinical_branch_probability * 100).toFixed(1)}%; Lifestyle Branch Probability: ${(prediction.lifestyle_branch_probability * 100).toFixed(1)}%; Behavioral Data Reliability Score: ${(prediction.lifestyle_reliability_score * 100).toFixed(0)}%. Recommended Action: ${prediction.clinical_action}`
      }
    ],
    note: [
      {
        text: `Top XAI Attributions: ${topDrivers.map(d => `${d.feature} (${d.impact})`).join('; ')}`
      },
      {
        text: 'Generated by CardioXAI Decision-Support Engine (Sarjan B. Thapa MSc Project, York St John University).'
      }
    ]
  };
}

/**
 * Generates a mock realistic FHIR R4 Bundle representing an ambulatory clinic EHR record.
 */
export function generateSampleFHIRBundle(patientId = 'NHS-982-341-209'): FHIRBundle {
  const now = new Date().toISOString();
  return {
    resourceType: 'Bundle',
    id: `bundle-${Date.now()}`,
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patientId,
          name: [{ family: 'Davies', given: ['Gareth'] }],
          gender: 'male',
          birthDate: '1970-04-12'
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-bp-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.BP_PANEL, display: 'Blood pressure systolic & diastolic' }]
          },
          effectiveDateTime: now,
          component: [
            {
              code: { coding: [{ system: 'http://loinc.org', code: LOINC.SYSTOLIC_BP, display: 'Systolic blood pressure' }] },
              valueQuantity: { value: 144, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
            },
            {
              code: { coding: [{ system: 'http://loinc.org', code: LOINC.DIASTOLIC_BP, display: 'Diastolic blood pressure' }] },
              valueQuantity: { value: 92, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
            }
          ]
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-hr-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.HEART_RATE, display: 'Heart rate' }]
          },
          effectiveDateTime: now,
          valueQuantity: { value: 78, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' }
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-weight-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.BODY_WEIGHT, display: 'Body weight' }]
          },
          effectiveDateTime: now,
          valueQuantity: { value: 86.5, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' }
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-height-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.BODY_HEIGHT, display: 'Body height' }]
          },
          effectiveDateTime: now,
          valueQuantity: { value: 174, unit: 'cm', system: 'http://unitsofmeasure.org', code: 'cm' }
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-chol-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.CHOL_TOTAL, display: 'Total Cholesterol' }]
          },
          effectiveDateTime: now,
          valueQuantity: { value: 218, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' }
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-smoke-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.TOBACCO_SMOKING, display: 'Tobacco smoking status' }]
          },
          effectiveDateTime: now,
          valueCodeableConcept: {
            coding: [{ system: 'http://snomed.info/sct', code: '449868002', display: 'Current every day smoker' }],
            text: 'Current smoker'
          }
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-steps-1',
          status: 'final',
          code: {
            coding: [{ system: 'http://loinc.org', code: LOINC.PHYSICAL_ACTIVITY, display: 'Number of steps in 24 hours' }]
          },
          effectiveDateTime: now,
          valueQuantity: { value: 3400, unit: 'steps', system: 'http://unitsofmeasure.org', code: 'steps' }
        }
      }
    ]
  };
}
