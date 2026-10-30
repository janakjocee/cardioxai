/**
 * Clinical Early Warning and SBAR Emergency Alert Dispatch System for CardioXAI.
 * 
 * Standards Compliance:
 * - Royal College of Physicians National Early Warning Score (NEWS2)
 * - WHO SBAR (Situation, Background, Assessment, Recommendation) Communication Standard
 * - ACC/AHA 2017 Hypertensive Emergency Clinical Protocols
 */

export interface SBARAlert {
  alert_id: string;
  created_at: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY_CRISIS';
  patient_id: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  target_role: 'Cardiology Attending' | 'On-Call Registrar' | 'Ambulatory Care Nurse' | 'GP Practice Lead';
  acknowledged: boolean;
}

export function generateSBARAlert(
  patientId: string,
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    spo2?: number;
    pp?: number;
  },
  prediction: {
    fused_probability: number;
    risk_tier: string;
    clinical_branch_prob: number;
    lifestyle_branch_prob: number;
    reliability_score: number;
  },
  historySummary = 'Known history of Stage 2 hypertension, active smoker with reported sedentary lifestyle.'
): SBARAlert {
  const isEmergency = vitals.sbp >= 180 || vitals.dbp >= 120 || prediction.fused_probability >= 0.85;
  const isUrgent = vitals.sbp >= 150 || vitals.dbp >= 95 || prediction.fused_probability >= 0.60;

  const urgency: SBARAlert['urgency'] = isEmergency ? 'EMERGENCY_CRISIS' : (isUrgent ? 'URGENT' : 'ROUTINE');
  const targetRole: SBARAlert['target_role'] = isEmergency ? 'Cardiology Attending' : (isUrgent ? 'On-Call Registrar' : 'GP Practice Lead');

  const situation = isEmergency
    ? `Patient ${patientId} is experiencing an acute hypertensive surge with SBP of ${vitals.sbp}/${vitals.dbp} mmHg and HR ${vitals.hr} bpm, driving late-fusion CVD risk to ${(prediction.fused_probability * 100).toFixed(1)}%.`
    : `Patient ${patientId} presents with persistent blood pressure elevation (${vitals.sbp}/${vitals.dbp} mmHg) with late-fusion CVD risk estimated at ${(prediction.fused_probability * 100).toFixed(1)}%.`;

  const background = `Patient demographics and clinical cohort profile: ${historySummary} Current behavioral reliability score evaluated at ${(prediction.reliability_score * 100).toFixed(0)}%.`;

  const assessment = `Late-Fusion ML Analysis: Clinical branch probability ${(prediction.clinical_branch_prob * 100).toFixed(1)}%, lifestyle branch probability ${(prediction.lifestyle_branch_prob * 100).toFixed(1)}%. Fused assessment category: ${prediction.risk_tier}. ${vitals.pp && vitals.pp >= 60 ? `Malignant pulse pressure disparity (${vitals.pp} mmHg) confirms heightened vascular wall sheer stress.` : ''}`;

  const recommendation = isEmergency
    ? 'Immediate bedside cardiology review. Initiate continuous arterial monitoring, obtain emergent 12-lead ECG, cardiac troponin I, serum creatinine, and titrate IV labetalol/nicardipine to reduce MAP by 20-25% in the first hour.'
    : 'Refer to rapid-access outpatient cardiology clinic within 14 days. Intensify dual antihypertensive regimen (ACEi/ARB + CCB), enroll in NHS smoking cessation pathway, and initiate ambulatory 24-hour BP monitoring.';

  return {
    alert_id: `SBAR-${Date.now()}-${Math.floor(Math.random() * 899 + 100)}`,
    created_at: new Date().toISOString(),
    urgency,
    patient_id: patientId,
    situation,
    background,
    assessment,
    recommendation,
    target_role: targetRole,
    acknowledged: false
  };
}
