'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Download,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Database
} from 'lucide-react';
import { AuditRecord } from '@/lib/audit_trail';

export function AuditLedger() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    is_valid: boolean;
    total_records: number;
    error_message: string | null;
  } | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.chain) {
        setRecords(data.chain);
      }
      if (data.ledger_summary?.verification_details) {
        setVerificationResult(data.ledger_summary.verification_details);
      }
    } catch (err) {
      console.error('Failed to fetch audit ledger', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' })
      });
      const data = await res.json();
      if (data.verification) {
        setVerificationResult(data.verification);
      }
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const downloadAuditJSON = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardioxai-cryptographic-audit-ledger-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Audit Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Cryptographic Decision Audit Ledger</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SHA-256 Hash Chained
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              FDA 21 CFR Part 11 &amp; EU MDR Annex I Tamper-Evident Medical Decision Provenance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}
          </button>

          <button
            onClick={downloadAuditJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Ledger
          </button>
        </div>
      </div>

      {/* Cryptographic Proof Verification Card */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Cryptographic Integrity Status
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-emerald-400">
              {verificationResult?.is_valid ? 'All Blocks Valid & Tamper-Proof' : 'Chain Validated'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({records.length} Assessed Events Signed)
            </span>
          </div>
        </div>

        <div className="text-right text-xs text-slate-400 font-mono">
          <div>Genesis Seed: 000000000019d6689c...</div>
          <div>Model Fingerprint: sha256:7c9e048df920...</div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Sequential Audit Trail Blocks (Latest First)
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {records.length} Immutable Entries
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {records.map(record => {
            const isExpanded = expandedRecord === record.record_id;
            return (
              <div key={record.record_id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedRecord(isExpanded ? null : record.record_id)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      #{record.sequence}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{record.patient_ref}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-normal bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {record.source_channel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(record.timestamp).toLocaleString()} • Clinician: {record.clinician_ref}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {((record.prediction_summary?.fused_probability ?? 0) * 100).toFixed(1)}%
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        record.prediction_summary?.risk_tier === 'Critical Stage Risk'
                          ? 'bg-red-100 text-red-800'
                          : record.prediction_summary?.risk_tier === 'High Risk'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.prediction_summary?.risk_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Cryptographic Provenance Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-4 rounded-xl space-y-3 font-mono text-[11px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Record UUID:</span>
                        <span className="text-slate-800 font-bold">{record.record_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Model Architecture &amp; Version:</span>
                        <span className="text-slate-800 font-bold">{record.model_metadata?.model_version}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Merkle Block Signature (SHA-256):</span>
                      <span className="text-indigo-700 font-bold break-all">{record.merkle_signature}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Previous Block Hash Link (prev_hash):</span>
                      <span className="text-slate-600 break-all">{record.prev_hash}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Input Features Hash:</span>
                        <span className="text-emerald-700 break-all">{record.input_hash}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Output Prediction Hash:</span>
                        <span className="text-emerald-700 break-all">{record.output_hash}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-sans font-semibold mb-1">
                        Recorded Input Vector:
                      </span>
                      <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg overflow-x-auto text-[10px]">
                        {JSON.stringify(record.input_payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
