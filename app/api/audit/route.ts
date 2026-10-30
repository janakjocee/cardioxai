import { NextResponse } from 'next/server';
import { globalAuditStore, verifyAuditChain } from '@/lib/audit_trail';

export async function GET() {
  const chain = globalAuditStore.getChain();
  const verification = globalAuditStore.verify();

  return NextResponse.json({
    ledger_summary: {
      standard: 'FDA 21 CFR Part 11 & EU MDR Annex I Cryptographic Audit Trail',
      total_records: chain.length,
      integrity_status: verification.is_valid ? 'VERIFIED_TAMPER_PROOF' : 'CORRUPTED',
      verification_details: verification
    },
    chain: chain.slice(-50).reverse() // Return latest 50 records in reverse chronological order
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'verify') {
      const result = globalAuditStore.verify();
      return NextResponse.json({ success: true, verification: result });
    }

    const {
      patient_ref,
      clinician_ref,
      source_channel,
      input_payload,
      prediction_summary
    } = body;

    const record = globalAuditStore.append(
      patient_ref || 'ANON-PATIENT',
      clinician_ref || 'SYSTEM-CDS',
      source_channel || 'ambulatory_portal',
      input_payload || {},
      prediction_summary || {
        fused_probability: 0.5,
        risk_tier: 'Moderate Risk',
        clinical_branch_prob: 0.5,
        lifestyle_branch_prob: 0.5,
        reliability_score: 1.0,
        clinical_action: 'Routine observation'
      }
    );

    return NextResponse.json({
      success: true,
      record
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 400 }
    );
  }
}
