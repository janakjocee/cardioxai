import { NextResponse } from 'next/server';
import { evaluateProductionDrift } from '@/lib/drift_monitor';

export async function GET() {
  const driftSummary = evaluateProductionDrift();
  return NextResponse.json({
    success: true,
    standards: [
      'FDA Good Machine Learning Practice (GMLP) Guiding Principles',
      'NHS DTAC Section D: AI Disparity & Safety Auditing'
    ],
    driftSummary
  });
}
