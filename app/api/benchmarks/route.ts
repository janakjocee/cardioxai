import { NextResponse } from 'next/server';
import benchmarkData from '@/public/ml_export.json';

export async function GET() {
  return NextResponse.json(benchmarkData);
}
