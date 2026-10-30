import { NextResponse } from 'next/server';
import { parseFHIRBundleToPatientInput, createFHIRRiskAssessment, generateSampleFHIRBundle, FHIRBundle } from '@/lib/fhir';

export async function GET() {
  // Returns a realistic sample FHIR R4 Bundle for EHR integration testing
  const sampleBundle = generateSampleFHIRBundle();
  return NextResponse.json({
    message: 'CardioXAI HL7 FHIR R4 Clinical Interoperability Endpoint',
    standard: 'HL7 FHIR Release 4 (v4.0.1)',
    loinc_profiles_supported: [
      '85354-9 (Blood Pressure Panel)',
      '8480-6 (Systolic BP)',
      '8462-4 (Diastolic BP)',
      '8867-4 (Heart Rate)',
      '29463-7 (Body Weight)',
      '8302-2 (Body Height)',
      '2093-3 (Total Cholesterol)',
      '2339-0 (Glucose)',
      '72166-2 (Tobacco Smoking)',
      '55423-8 (Physical Activity / Steps)',
      '75492-9 (Cardiovascular Risk Assessment Score)'
    ],
    sample_incoming_bundle: sampleBundle
  });
}

export async function POST(request: Request) {
  try {
    const body: FHIRBundle = await request.json();
    
    // Parse FHIR bundle into CardioXAI patient input
    const { patient, provenance } = parseFHIRBundleToPatientInput(body);

    // Call internal predict logic
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const predictRes = await fetch(`${protocol}://${host}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });

    if (!predictRes.ok) {
      throw new Error(`Prediction engine responded with status: ${predictRes.status}`);
    }

    const predictionData = await predictRes.json();

    // Generate standard FHIR RiskAssessment
    const fhirRiskAssessment = createFHIRRiskAssessment(
      provenance.patient_id,
      predictionData.predictions,
      predictionData.xai?.shap?.attributions || []
    );

    return NextResponse.json({
      success: true,
      standard: 'HL7 FHIR R4',
      provenance,
      extracted_features: patient,
      fhir_risk_assessment: fhirRiskAssessment,
      cardioxai_result: predictionData
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process FHIR R4 Bundle',
        details: err?.message || String(err)
      },
      { status: 400 }
    );
  }
}
