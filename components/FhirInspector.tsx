'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Send,
  Download,
  Copy,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { generateSampleFHIRBundle, FHIRBundle } from '@/lib/fhir';

export function FhirInspector() {
  const [fhirInput, setFhirInput] = useState<string>(
    JSON.stringify(generateSampleFHIRBundle(), null, 2)
  );
  const [responseOutput, setResponseOutput] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendFHIR = async () => {
    try {
      setLoading(true);
      const parsed = JSON.parse(fhirInput);
      const res = await fetch('/api/fhir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      setResponseOutput(data);
    } catch (err: any) {
      alert(`Invalid JSON or request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setFhirInput(JSON.stringify(generateSampleFHIRBundle(), null, 2));
    setResponseOutput(null);
  };

  const copyResponse = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(JSON.stringify(responseOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">HL7 FHIR R4 Clinical Interoperability Sandbox</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                FHIR R4 (v4.0.1)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingest EHR Observation Bundles using LOINC &amp; SNOMED-CT • Emit FHIR RiskAssessment (75492-9)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSample}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            Reset Sample EHR Bundle
          </button>
          <button
            onClick={handleSendFHIR}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Evaluating FHIR Bundle...' : 'Execute FHIR Assessment'}
          </button>
        </div>
      </div>

      {/* Code Editor and Output Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming FHIR Bundle JSON */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Incoming EHR FHIR R4 Bundle
            </span>
            <span className="text-[11px] font-mono text-slate-400">Content-Type: application/fhir+json</span>
          </div>

          <textarea
            value={fhirInput}
            onChange={e => setFhirInput(e.target.value)}
            rows={18}
            className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-x-auto"
            placeholder="Paste raw FHIR R4 Bundle JSON here..."
          />

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Standard LOINC: 8480-6 (SBP), 8462-4 (DBP), 8867-4 (HR), 72166-2 (Tobacco)</span>
            <span className="text-slate-400 font-mono">{fhirInput.length} bytes</span>
          </div>
        </div>

        {/* Generated FHIR RiskAssessment & Model Response */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Standard FHIR RiskAssessment Output
            </span>
            {responseOutput && (
              <button
                onClick={copyResponse}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 border border-slate-200"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied to Clipboard!' : 'Copy FHIR'}
              </button>
            )}
          </div>

          {responseOutput ? (
            <div className="space-y-4">
              {/* Quick Summary Pill Banner */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Patient Assessment Result:</span>
                  <strong className="text-indigo-950">
                    {responseOutput.provenance?.patient_name} ({responseOutput.provenance?.patient_id})
                  </strong>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-indigo-700">
                    {((responseOutput.cardioxai_result?.predictions?.fused_probability ?? 0) * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
                    {responseOutput.cardioxai_result?.predictions?.risk_tier}
                  </span>
                </div>
              </div>

              {/* FHIR RiskAssessment JSON Viewer */}
              <pre className="w-full h-80 bg-slate-950 text-cyan-300 font-mono text-xs p-4 rounded-xl border border-slate-800 overflow-y-auto">
                {JSON.stringify(responseOutput.fhir_risk_assessment || responseOutput, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-slate-400 text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileCode className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No FHIR Assessment Triggered Yet</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Click <strong>"Execute FHIR Assessment"</strong> above to ingest the HL7 FHIR Bundle and generate a standardized clinical RiskAssessment resource.
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Interoperability Target: Epic Systems / Cerner Millennium EHR Integration</span>
            <span className="font-mono text-emerald-600 font-bold">SNOMED: 49436004</span>
          </div>
        </div>
      </div>
    </div>
  );
}
