'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Key,
  Server,
  User,
  Hospital,
  ArrowRight,
  Database,
  Lock,
  Layers
} from 'lucide-react';
import { createMockSMARTSession, SMARTTokenResponse } from '@/lib/smart_fhir';

export function SmartFhirLauncher() {
  const [selectedEhr, setSelectedEhr] = useState<'Epic Systems' | 'Cerner Millennium' | 'NHS Digital'>('Epic Systems');
  const [session, setSession] = useState<any | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleSimulateEhrLaunch = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      const mockSession = createMockSMARTSession(selectedEhr);
      setSession(mockSession);
      setIsAuthorizing(false);
    }, 700);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Hospital className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">SMART on FHIR Enterprise EHR App Launcher</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                HL7 SMART v2.0
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Launch directly inside Epic Systems (MyChart/Hyperspace) and Cerner Millennium (PowerChart)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/.well-known/smart-configuration"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            View /.well-known/smart-configuration
          </a>
        </div>
      </div>

      {/* EHR Vendor Selector & Simulator */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              EHR Clinical Context Simulation Sandbox
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select a hospital EHR platform to simulate OAuth 2.0 PKCE launch and patient context handoff
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['Epic Systems', 'Cerner Millennium', 'NHS Digital'] as const).map(ehr => (
              <button
                key={ehr}
                onClick={() => {
                  setSelectedEhr(ehr);
                  setSession(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedEhr === ehr
                    ? 'bg-purple-600 text-white font-semibold shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ehr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-600 font-mono">
            Target FHIR Base: <span className="text-indigo-600 font-bold">https://fhir.{selectedEhr.toLowerCase().replace(/\s+/g, '')}.com/r4</span>
          </div>

          <button
            onClick={handleSimulateEhrLaunch}
            disabled={isAuthorizing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Key className={`w-3.5 h-3.5 ${isAuthorizing ? 'animate-spin' : ''}`} />
            {isAuthorizing ? 'Exchanging OAuth2 Token...' : `Authorize SMART Launch from ${selectedEhr}`}
          </button>
        </div>
      </div>

      {/* Active EHR Session Panel */}
      {session && (
        <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Authenticated SMART EHR Context Established
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              OAuth2 Bearer Token Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">In-Context Patient</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{session.patient_name}</span>
              <span className="text-[10px] text-slate-500 font-mono">{session.patient_id}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Attending Clinician</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{session.clinician_name}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">GMC Verified</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Encounter Ref</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{session.encounter_id}</span>
              <span className="text-[10px] text-slate-500">Ambulatory Cardiology</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">FHIR Scopes Granted</span>
              <span className="font-bold text-indigo-700 mt-0.5 block font-mono text-[11px]">patient/*.read, write</span>
              <span className="text-[10px] text-slate-400">RiskAssessment.write enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
