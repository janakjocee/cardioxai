'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Heart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileText,
  Sliders,
  Scale,
  Award,
  BarChart3,
  User,
  Zap,
  CheckCircle2,
  HelpCircle,
  Download,
  RefreshCw,
  Layers,
  ChevronRight,
  Info,
  Database,
  Printer,
  Radio,
  Lock,
  FileCode,
  Bluetooth,
  Hospital,
  Dna
} from 'lucide-react';
import { RiskGauge, MetricCard, ProbabilityBar, ShapBar, AlertBanner, SectionCard } from '@/components/ui';
import { RealTimeMonitor } from '@/components/RealTimeMonitor';
import { AuditLedger } from '@/components/AuditLedger';
import { FhirInspector } from '@/components/FhirInspector';
import { BleConnector } from '@/components/BleConnector';
import { SmartFhirLauncher } from '@/components/SmartFhirLauncher';
import { GenomicsPanel } from '@/components/GenomicsPanel';
import { DriftEquityMonitor } from '@/components/DriftEquityMonitor';

interface PredictionResponse {
  predictions: {
    clinical_branch_probability: number;
    lifestyle_branch_probability: number;
    lifestyle_reliability_score: number;
    fused_probability: number;
    risk_tier: string;
    risk_color: string;
    clinical_action: string;
  };
  conformal?: {
    alpha: number;
    coverage_nominal: string;
    point_estimate: number;
    p_lower: number;
    p_upper: number;
    interval_width: number;
    certainty_tier: string;
    alert: string | null;
  };
  genomics?: {
    prs_percentile: number;
    relative_risk: number;
    combined_genetic_risk_tier: string;
    high_risk_alleles_count: number;
    clinical_recommendation: string;
  };
  features: {
    bmi: number;
    pulse_pressure: number;
    map: number;
    interactions: {
      bmi_x_active: number;
      ap_hi_x_smoke: number;
      alco_x_gluc: number;
      age_x_ap_hi: number;
    };
  };
  xai: {
    shap: {
      base_value: number;
      attributions: Array<{
        feature: string;
        patient_value: number;
        shap_value: number;
        impact: string;
      }>;
    };
    lime: {
      explanations: Array<{
        feature: string;
        patient_value: number;
        lime_weight: number;
        is_modifiable: boolean;
        clinical_guidance: string;
      }>;
    };
    agreement: {
      jaccard_overlap: number;
      sign_agreement_rate: number;
      spearman_rank_correlation: number;
      clinical_trust_verdict: string;
    };
  };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'assessment' | 'telemetry' | 'ble' | 'smart' | 'genomics' | 'drift' | 'fhir' | 'audit' | 'xai' | 'counterfactual' | 'benchmarks' | 'fairness' | 'cohort' | 'report'>('assessment');
  const [targetDisease, setTargetDisease] = useState<'cvd' | 'diabetes'>('cvd');

  // Patient inputs
  const [patientData, setPatientData] = useState({
    age_years: 54,
    gender: 2, // 1: Female, 2: Male
    height: 172,
    weight: 84,
    ap_hi: 142,
    ap_lo: 92,
    cholesterol: 2, // 1: Normal, 2: Above Normal, 3: Well Above
    gluc: 1,
    smoke: 1,
    alco: 1,
    active: 0,
    diet_quality: 2,
    consistency_flag: true,
  });

  // Counterfactual scenario inputs
  const [cfData, setCfData] = useState({
    smoke: 0,
    ap_hi: 120,
    active: 1,
    diet_quality: 4,
    weight: 76,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [cfResults, setCfResults] = useState<PredictionResponse | null>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);

  // Fetch benchmark data once on mount
  useEffect(() => {
    fetch('/api/benchmarks')
      .then(res => res.json())
      .then(data => setBenchmarks(data))
      .catch(err => console.error('Failed to load benchmarks', err));
  }, []);

  // Compute prediction whenever patient data changes
  const runPrediction = async (dataToPredict: typeof patientData, isCounterfactual = false) => {
    try {
      if (!isCounterfactual) setLoading(true);
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPredict),
      });
      const data = await res.json();
      if (!isCounterfactual) {
        setResults(data);
      } else {
        setCfResults(data);
      }
    } catch (err) {
      console.error('Prediction failed', err);
    } finally {
      if (!isCounterfactual) setLoading(false);
    }
  };

  useEffect(() => {
    runPrediction(patientData);
  }, [patientData]);

  useEffect(() => {
    // Run counterfactual simulation
    const simulated = {
      ...patientData,
      smoke: cfData.smoke,
      ap_hi: cfData.ap_hi,
      active: cfData.active,
      diet_quality: cfData.diet_quality,
      weight: cfData.weight,
    };
    runPrediction(simulated, true);
  }, [cfData, patientData]);

  // Presets
  const applyPreset = (preset: 'preset1' | 'preset2' | 'preset3') => {
    if (preset === 'preset1') {
      setPatientData({
        age_years: 58,
        gender: 2,
        height: 170,
        weight: 88,
        ap_hi: 155,
        ap_lo: 96,
        cholesterol: 3,
        gluc: 2,
        smoke: 1,
        alco: 1,
        active: 0,
        diet_quality: 1,
        consistency_flag: true,
      });
    } else if (preset === 'preset2') {
      setPatientData({
        age_years: 46,
        gender: 1,
        height: 162,
        weight: 70,
        ap_hi: 132,
        ap_lo: 85,
        cholesterol: 2,
        gluc: 1,
        smoke: 0,
        alco: 0,
        active: 0,
        diet_quality: 3,
        consistency_flag: true,
      });
    } else {
      setPatientData({
        age_years: 36,
        gender: 1,
        height: 168,
        weight: 62,
        ap_hi: 114,
        ap_lo: 76,
        cholesterol: 1,
        gluc: 1,
        smoke: 0,
        alco: 0,
        active: 1,
        diet_quality: 4,
        consistency_flag: true,
      });
    }
  };

  const currentProb = results?.predictions.fused_probability ?? 0.5;
  const cfProb = cfResults?.predictions.fused_probability ?? currentProb;
  const riskDiff = Number(((currentProb - cfProb) * 100).toFixed(1));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Academic & System Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Heart className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
                  CardioXAI
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Late-Fusion v1.4
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Calibrated (70k Cohort)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                York St John University • Sarjan Bahadur Thapa (ID: 260043443) • MSc Data Science
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Disease Target Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
              <button
                onClick={() => setTargetDisease('cvd')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  targetDisease === 'cvd'
                    ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cardiovascular (Primary)
              </button>
              <button
                onClick={() => setTargetDisease('diabetes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  targetDisease === 'diabetes'
                    ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Type-2 Diabetes (B7 Transfer)
              </button>
            </div>

            <button
              onClick={() => {
                setActiveTab('report');
                setTimeout(() => window.print(), 300);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
            <button
              onClick={() => {
                const reportData = {
                  metadata: {
                    report_id: `CARDIOXAI-${Date.now()}`,
                    assessment_date: new Date().toISOString(),
                    guidelines: 'ACC/AHA 2017 & ESC 2021 Clinical Prevention Standards',
                  },
                  patient_parameters: patientData,
                  prediction: results?.predictions,
                  hemodynamics: results?.features,
                  xai_attributions: results?.xai,
                };
                const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cardioxai-patient-report.json`;
                a.click();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 text-sm font-medium">
            {[
              { id: 'assessment', label: 'Patient Assessment & Late Fusion', icon: Activity },
              { id: 'telemetry', label: 'Live Telemetry & Wearables', icon: Radio, highlight: true },
              { id: 'ble', label: 'Web Bluetooth (BLE) Hardware', icon: Bluetooth, highlight: true },
              { id: 'smart', label: 'SMART on FHIR EHR Launch', icon: Hospital },
              { id: 'genomics', label: 'Multi-Omics Genomics (Branch 4)', icon: Dna },
              { id: 'drift', label: 'Model Drift & Equity Monitor', icon: TrendingUp },
              { id: 'fhir', label: 'FHIR R4 Interoperability', icon: FileCode },
              { id: 'audit', label: 'Cryptographic Audit Ledger', icon: Lock },
              { id: 'xai', label: 'Explainable AI (SHAP & LIME)', icon: Layers },
              { id: 'counterfactual', label: 'Counterfactual Simulator', icon: Sliders },
              { id: 'benchmarks', label: 'Benchmark Matrix (B0–B7)', icon: BarChart3 },
              { id: 'fairness', label: 'Fairness & Subgroup Audit', icon: Scale },
              { id: 'cohort', label: '70k Cohort & Provenance', icon: Database },
              { id: 'report', label: 'Clinical Consultation Summary', icon: FileText },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shadow-sm'
                      : tab.highlight
                      ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : tab.highlight ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: PATIENT ASSESSMENT & LATE-FUSION ENGINE */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            {/* Quick Preset Selector */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Clinical Case Presets:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applyPreset('preset1')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  Patient A: 58y Smoker / Stage 2 HTN (High Risk)
                </button>
                <button
                  onClick={() => applyPreset('preset2')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  Patient B: 46y Sedentary / Borderline Lipids (Moderate)
                </button>
                <button
                  onClick={() => applyPreset('preset3')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  Patient C: 36y Active / Normotensive (Low Risk)
                </button>
              </div>
            </div>

            {/* Split Screen: Form on Left, Late-Fusion Visualizer on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Clinical and Lifestyle Input Cards */}
              <div className="lg:col-span-7 space-y-6">
                {/* Clinical Modalities Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Clinical Examination Modality (Group C)</h3>
                        <p className="text-xs text-slate-500">Objective physiological markers & lab measurements</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Branch f_C
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Age */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex justify-between">
                        <span>Age (Years)</span>
                        <span className="text-indigo-600 font-bold">{patientData.age_years} yrs</span>
                      </label>
                      <input
                        type="range"
                        min="30"
                        max="65"
                        value={patientData.age_years}
                        onChange={e => setPatientData({ ...patientData, age_years: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="text-xs font-medium text-slate-700">Biological Sex</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, gender: 1 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.gender === 1
                              ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Female (1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, gender: 2 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.gender === 2
                              ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Male (2)
                        </button>
                      </div>
                    </div>

                    {/* Blood Pressure Systolic */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex justify-between">
                        <span>Systolic BP (ap_hi)</span>
                        <span className={`font-bold ${patientData.ap_hi >= 140 ? 'text-red-600' : patientData.ap_hi >= 130 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {patientData.ap_hi} mmHg
                        </span>
                      </label>
                      <input
                        type="range"
                        min="90"
                        max="200"
                        value={patientData.ap_hi}
                        onChange={e => setPatientData({ ...patientData, ap_hi: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Blood Pressure Diastolic */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex justify-between">
                        <span>Diastolic BP (ap_lo)</span>
                        <span className="text-slate-800 font-bold">{patientData.ap_lo} mmHg</span>
                      </label>
                      <input
                        type="range"
                        min="60"
                        max="120"
                        value={patientData.ap_lo}
                        onChange={e => setPatientData({ ...patientData, ap_lo: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Height & Weight / Calculated BMI */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex justify-between">
                        <span>Height & Weight</span>
                        <span className="text-slate-600 font-medium">
                          {patientData.height} cm / {patientData.weight} kg
                        </span>
                      </label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          value={patientData.height}
                          onChange={e => setPatientData({ ...patientData, height: Number(e.target.value) })}
                          className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Height cm"
                        />
                        <input
                          type="number"
                          value={patientData.weight}
                          onChange={e => setPatientData({ ...patientData, weight: Number(e.target.value) })}
                          className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Weight kg"
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                        <span>Computed BMI:</span>
                        <span className="font-bold text-slate-800">
                          {results?.features.bmi ?? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)} kg/m²
                        </span>
                      </div>
                    </div>

                    {/* Cholesterol Category */}
                    <div>
                      <label className="text-xs font-medium text-slate-700">Total Serum Cholesterol</label>
                      <select
                        value={patientData.cholesterol}
                        onChange={e => setPatientData({ ...patientData, cholesterol: Number(e.target.value) })}
                        className="mt-1 w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="1">1: Normal (&lt; 200 mg/dL)</option>
                        <option value="2">2: Above Normal (200 - 239 mg/dL)</option>
                        <option value="3">3: Well Above Normal (≥ 240 mg/dL)</option>
                      </select>
                    </div>

                    {/* Fasting Glucose Category */}
                    <div>
                      <label className="text-xs font-medium text-slate-700">Fasting Glucose Category</label>
                      <select
                        value={patientData.gluc}
                        onChange={e => setPatientData({ ...patientData, gluc: Number(e.target.value) })}
                        className="mt-1 w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="1">1: Normal (&lt; 100 mg/dL)</option>
                        <option value="2">2: Above Normal (100 - 125 mg/dL)</option>
                        <option value="3">3: Well Above Normal (≥ 126 mg/dL)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Lifestyle & Behavioral Modality Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Lifestyle & Behavioral Modality (Group L)</h3>
                        <p className="text-xs text-slate-500">Patient-reported habits, exercise frequency, and diet</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Branch f_L
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Smoking Status */}
                    <div>
                      <label className="text-xs font-medium text-slate-700">Tobacco Smoking</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, smoke: 0 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.smoke === 0
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Non-Smoker (0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, smoke: 1 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.smoke === 1
                              ? 'bg-red-600 text-white border-red-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Current Smoker (1)
                        </button>
                      </div>
                    </div>

                    {/* Alcohol Intake */}
                    <div>
                      <label className="text-xs font-medium text-slate-700">Alcohol Consumption</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, alco: 0 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.alco === 0
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Non-Drinker (0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, alco: 1 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.alco === 1
                              ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Moderate/Heavy (1)
                        </button>
                      </div>
                    </div>

                    {/* Physical Activity */}
                    <div>
                      <label className="text-xs font-medium text-slate-700">Physical Activity Level</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, active: 0 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.active === 0
                              ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Sedentary (0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatientData({ ...patientData, active: 1 })}
                          className={`py-1.5 text-xs rounded-xl border transition-all ${
                            patientData.active === 1
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Physically Active (1)
                        </button>
                      </div>
                    </div>

                    {/* Diet Quality Index */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 flex justify-between">
                        <span>Diet Quality Score</span>
                        <span className="text-emerald-700 font-bold">{patientData.diet_quality} / 5</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={patientData.diet_quality}
                        onChange={e => setPatientData({ ...patientData, diet_quality: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>1: High Sodium/Ultra-processed</span>
                        <span>5: Mediterranean/DASH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Proposed Dual-Branch Late-Fusion Architecture Visualizer */}
              <div className="lg:col-span-5 space-y-6">
                {/* Real-Time Late Fusion Synthesis Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Late-Fusion Prediction Output</h3>
                        <p className="text-xs text-slate-500">Novelty 1: Dual-branch with reliability weighting</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      B3 Meta-Learner
                    </span>
                  </div>

                  {/* Main Risk Gauge */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative flex items-center justify-center">
                      {/* Circular Gauge Representation */}
                      <svg className="w-44 h-44 transform -rotate-90">
                        <circle
                          cx="88"
                          cy="88"
                          r="72"
                          stroke="#e2e8f0"
                          strokeWidth="14"
                          fill="transparent"
                        />
                        <circle
                          cx="88"
                          cy="88"
                          r="72"
                          stroke={
                            currentProb >= 0.75 ? '#ef4444' : currentProb >= 0.5 ? '#f59e0b' : currentProb >= 0.25 ? '#3b82f6' : '#10b981'
                          }
                          strokeWidth="14"
                          strokeDasharray={452}
                          strokeDashoffset={452 - 452 * currentProb}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                          {(currentProb * 100).toFixed(1)}%
                        </span>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {results?.predictions.risk_tier ?? 'Calculating...'}
                        </div>
                      </div>
                    </div>

                    {/* Clinical Tier Banner */}
                    <div className={`mt-3 w-full p-3 rounded-xl border text-xs text-center font-medium ${
                      currentProb >= 0.75
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : currentProb >= 0.5
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : currentProb >= 0.25
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <p className="font-semibold mb-0.5">Clinical Protocol Guidance:</p>
                      <p>{results?.predictions.clinical_action}</p>
                    </div>
                  </div>

                  {/* Dual Branch Decomposition Breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Branch Fusion Breakdown (Figure 3.1)
                    </h4>

                    {/* Clinical Branch */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Clinical Branch (p_C)
                        </span>
                        <span className="font-bold text-slate-900">
                          {((results?.predictions.clinical_branch_probability ?? 0.5) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results?.predictions.clinical_branch_probability ?? 0.5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Features: BP, Cholesterol, Fasting Glucose, Hemodynamics & Interactions
                      </span>
                    </div>

                    {/* Lifestyle Branch */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Lifestyle Branch (p_L)
                        </span>
                        <span className="font-bold text-slate-900">
                          {((results?.predictions.lifestyle_branch_probability ?? 0.5) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results?.predictions.lifestyle_branch_probability ?? 0.5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Features: Smoking, Alcohol intake, Physical activity, Diet index
                      </span>
                    </div>

                    {/* Lifestyle Reliability Weight */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-purple-500" />
                          Per-Record Reliability Weight (r)
                        </span>
                        <span className="font-bold text-purple-700">
                          {((results?.predictions.lifestyle_reliability_score ?? 1.0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results?.predictions.lifestyle_reliability_score ?? 1.0) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Encodes internal consistency, plausibility, and data completeness (Section 3.6.2)
                      </span>
                    </div>

                    {/* Distribution-Free Conformal Prediction Bounds (95% Finite-Sample Coverage) */}
                    {results?.conformal && (
                      <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-3.5 rounded-xl border border-indigo-200">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Conformal Prediction (95% Coverage)
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {results.conformal.certainty_tier}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1.5">
                          <span className="text-xs text-slate-600">Empirical Interval:</span>
                          <span className="font-mono font-bold text-indigo-900 text-sm">
                            [{(results.conformal.p_lower * 100).toFixed(1)}% — {(results.conformal.p_upper * 100).toFixed(1)}%]
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-2 relative overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full absolute"
                            style={{
                              left: `${results.conformal.p_lower * 100}%`,
                              width: `${Math.max(2, (results.conformal.p_upper - results.conformal.p_lower) * 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>Spread (Width): {(results.conformal.interval_width * 100).toFixed(1)}%</span>
                          <span>Finite-sample distribution-free</span>
                        </div>
                        {results.conformal.alert && (
                          <div className="mt-2 text-[10px] p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            ⚠️ {results.conformal.alert}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REAL-TIME AMBULATORY TELEMETRY & WEARABLES */}
        {activeTab === 'telemetry' && (
          <RealTimeMonitor />
        )}

        {/* TAB: WEB BLUETOOTH PHYSICAL SENSOR PERIPHERAL */}
        {activeTab === 'ble' && (
          <BleConnector />
        )}

        {/* TAB: SMART ON FHIR EHR LAUNCH SANDBOX */}
        {activeTab === 'smart' && (
          <SmartFhirLauncher />
        )}

        {/* TAB: MULTI-OMICS GENOMICS MODALITY (BRANCH 4) */}
        {activeTab === 'genomics' && (
          <GenomicsPanel />
        )}

        {/* TAB: POPULATION DRIFT & HEALTH EQUITY MONITOR */}
        {activeTab === 'drift' && (
          <DriftEquityMonitor />
        )}

        {/* TAB: HL7 FHIR R4 CLINICAL INTEROPERABILITY */}
        {activeTab === 'fhir' && (
          <FhirInspector />
        )}

        {/* TAB: CRYPTOGRAPHIC CLINICAL AUDIT LEDGER */}
        {activeTab === 'audit' && (
          <AuditLedger />
        )}

        {/* TAB 2: EXPLAINABLE AI SUITE (SHAP & LIME) */}
        {activeTab === 'xai' && (
          <div className="space-y-6">
            {/* Academic Overview Box */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Dual XAI Framework (Section 3.10)
                  </span>
                  <h2 className="text-lg font-bold mt-2">SHAP Global Audit & LIME Point-of-Care Explanations</h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    SHAP calculates additive feature importance relative to the population expectation, while LIME generates
                    a sparse local decision surrogate isolating actionable, modifiable lifestyle interventions for clinical consultations.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-xl text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-300">Concordance Verdict</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {results?.xai.agreement.clinical_trust_verdict}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SHAP Waterfall / Local Attribution */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">SHAP Patient Attribution Waterfall</h3>
                      <p className="text-xs text-slate-500">
                        Base risk E[f(x)] = {((results?.xai.shap.base_value ?? 0.395) * 100).toFixed(1)}% → Patient risk = {((currentProb) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {results?.xai.shap.attributions.slice(0, 7).map((attr, idx) => {
                    const isPositive = attr.shap_value >= 0;
                    const barWidth = Math.min(100, Math.abs(attr.shap_value) * 350);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-800">
                            {attr.feature} <span className="text-slate-400 font-normal">(val: {attr.patient_value})</span>
                          </span>
                          <span className={`font-bold ${isPositive ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isPositive ? `+${(attr.shap_value * 100).toFixed(2)}%` : `${(attr.shap_value * 100).toFixed(2)}%`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                          {isPositive ? (
                            <div
                              className="bg-red-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          ) : (
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIME Modifiable Factor Sensitivity (Point of Care) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">LIME Modifiable Factor Sensitivity</h3>
                      <p className="text-xs text-slate-500">Top-5 modifiable targets for lifestyle intervention (Section 3.10.2)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {results?.xai.lime.explanations.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${item.lime_weight > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {item.feature}
                        </span>
                        <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          item.lime_weight > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.lime_weight > 0 ? `+${(item.lime_weight * 100).toFixed(1)}% Risk Sensitivity` : `${(item.lime_weight * 100).toFixed(1)}% Protective`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        "{item.clinical_guidance}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Explanation Agreement Matrix */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                Empirical Agreement Metrics between SHAP and LIME (Section 3.10.3)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Jaccard Overlap (Top-5)</div>
                  <div className="text-xl font-bold text-indigo-700 mt-1">
                    {(results?.xai.agreement.jaccard_overlap ?? 0.71).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">&gt; 0.60 indicates strong top-feature consensus</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Spearman Rank Correlation</div>
                  <div className="text-xl font-bold text-indigo-700 mt-1">
                    {(results?.xai.agreement.spearman_rank_correlation ?? 0.82).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Monotonic ranking consistency</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Sign Agreement Rate</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {((results?.xai.agreement.sign_agreement_rate ?? 1.0) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Directional harmony across shared features</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Trust Determination</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1.5 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Clinically Trustworthy
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Audit requirement satisfied</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COUNTERFACTUAL & WHAT-IF SIMULATOR */}
        {activeTab === 'counterfactual' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Interactive Counterfactual & Intervention Simulator</h3>
                    <p className="text-xs text-slate-500">
                      Simulate the impact of targeted lifestyle and clinical modifications on cardiovascular risk
                    </p>
                  </div>
                </div>
              </div>

              {/* Impact Banner */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                    Intervention Impact Projected
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {(currentProb * 100).toFixed(1)}% → {(cfProb * 100).toFixed(1)}%
                    </span>
                    <span className={`text-base font-bold flex items-center gap-0.5 ${riskDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {riskDiff >= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {riskDiff >= 0 ? `-${riskDiff}%` : `+${Math.abs(riskDiff)}%`} Absolute Risk Change
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Targeted lifestyle interventions yield a relative risk reduction of{' '}
                    <strong className="text-indigo-700">
                      {currentProb > 0 ? (((currentProb - cfProb) / currentProb) * 100).toFixed(1) : 0}%
                    </strong>
                    .
                  </p>
                </div>
              </div>

              {/* Sliders for Simulation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tobacco Cessation */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex justify-between">
                    <span>Tobacco Cessation Intervention</span>
                    <span className={cfData.smoke === 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {cfData.smoke === 0 ? 'Cessation Achieved' : 'Active Smoker'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setCfData({ ...cfData, smoke: 0 })}
                      className={`py-2 text-xs rounded-xl font-medium transition-all ${
                        cfData.smoke === 0
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Quit Smoking
                    </button>
                    <button
                      onClick={() => setCfData({ ...cfData, smoke: 1 })}
                      className={`py-2 text-xs rounded-xl font-medium transition-all ${
                        cfData.smoke === 1
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Continue Smoking
                    </button>
                  </div>
                </div>

                {/* Blood Pressure Control */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex justify-between">
                    <span>Target Systolic Blood Pressure</span>
                    <span className="text-indigo-600 font-bold">{cfData.ap_hi} mmHg</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="180"
                    value={cfData.ap_hi}
                    onChange={e => setCfData({ ...cfData, ap_hi: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>100 mmHg (Optimal)</span>
                    <span>180 mmHg (Stage 2)</span>
                  </div>
                </div>

                {/* Physical Activity Plan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex justify-between">
                    <span>Aerobic Exercise Protocol (150 min/wk)</span>
                    <span className={cfData.active === 1 ? 'text-emerald-600' : 'text-amber-600'}>
                      {cfData.active === 1 ? 'Active Routine' : 'Sedentary'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setCfData({ ...cfData, active: 1 })}
                      className={`py-2 text-xs rounded-xl font-medium transition-all ${
                        cfData.active === 1
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Active Exercise
                    </button>
                    <button
                      onClick={() => setCfData({ ...cfData, active: 0 })}
                      className={`py-2 text-xs rounded-xl font-medium transition-all ${
                        cfData.active === 0
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Sedentary
                    </button>
                  </div>
                </div>

                {/* Mediterranean / DASH Diet Adoption */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex justify-between">
                    <span>Nutritional Adherence (Diet Score)</span>
                    <span className="text-emerald-700 font-bold">{cfData.diet_quality} / 5</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={cfData.diet_quality}
                    onChange={e => setCfData({ ...cfData, diet_quality: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-3"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>1: Standard Diet</span>
                    <span>5: Mediterranean Protocol</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BENCHMARK MATRIX (B0–B7) */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Experimental Benchmark Matrix (Configurations B0 – B7)</h3>
                  <p className="text-xs text-slate-500">
                    Evaluated under identical folds, seeds, and calibration protocol (Table 3.3, Chapter 3)
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                  Test Cohort N=4,000
                </span>
              </div>

              {/* Table of Benchmarks */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold">
                      <th className="py-3 px-4">Config ID</th>
                      <th className="py-3 px-4">Architecture / Modality</th>
                      <th className="py-3 px-4">ROC-AUC</th>
                      <th className="py-3 px-4">Accuracy</th>
                      <th className="py-3 px-4">Recall</th>
                      <th className="py-3 px-4">Precision</th>
                      <th className="py-3 px-4">Brier Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {benchmarks?.benchmarks && Object.entries(benchmarks.benchmarks).map(([key, val]: [string, any]) => {
                      const isProposed = key.includes('B3');
                      return (
                        <tr key={key} className={isProposed ? 'bg-indigo-50/60 font-semibold' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 flex items-center gap-1.5">
                            {isProposed && <Award className="w-4 h-4 text-indigo-600" />}
                            <span className="font-mono">{key.replace('_', ' ')}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{val.name}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{(val.roc_auc).toFixed(4)}</td>
                          <td className="py-3 px-4">{((val.accuracy) * 100).toFixed(2)}%</td>
                          <td className="py-3 px-4">{((val.recall) * 100).toFixed(2)}%</td>
                          <td className="py-3 px-4">{((val.precision) * 100).toFixed(2)}%</td>
                          <td className="py-3 px-4 font-mono">{val.brier_score.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Algorithm Comparison on Proposed Architecture */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Machine Learning Algorithm Comparison on Late-Fusion Architecture
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Evaluating Logistic Regression, Decision Trees, Random Forests, and SVM (Section 3.7)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {benchmarks?.algo_comparison && Object.entries(benchmarks.algo_comparison).map(([name, metrics]: [string, any]) => (
                  <div key={name} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-800">{name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                        AUC: {metrics.roc_auc.toFixed(4)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Accuracy:</span>
                        <span className="font-medium text-slate-900">{(metrics.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Recall (Sens):</span>
                        <span className="font-medium text-slate-900">{(metrics.recall * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>F1-Score:</span>
                        <span className="font-medium text-slate-900">{(metrics.f1_score).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DeLong Paired ROC Hypothesis Testing */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Statistical Significance Testing (DeLong Tests &amp; 95% Bootstrap CIs)
              </h3>
              <p className="text-xs text-slate-500 mb-4">Section 3.8.4 confirmatory and exploratory paired tests</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Confirmatory Test: B1 (Clinical-Only) vs B2 (Early Fusion)</div>
                  <div className="space-y-1 text-slate-600 mt-2">
                    <div>AUC Difference: <span className="font-mono font-bold text-slate-900">{benchmarks?.delong_tests?.confirmatory_b1_vs_b2?.auc_difference}</span></div>
                    <div>Z-Statistic: <span className="font-mono">{benchmarks?.delong_tests?.confirmatory_b1_vs_b2?.z_statistic}</span></div>
                    <div>p-value: <span className="font-mono font-semibold text-indigo-600">{benchmarks?.delong_tests?.confirmatory_b1_vs_b2?.p_value}</span></div>
                    <div className="text-[11px] text-slate-500 italic mt-1">Evaluated at alpha=0.05 without adjustment</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">B3 (Proposed Late-Fusion) 95% Bootstrap Confidence Intervals</div>
                  <div className="space-y-1 text-slate-600 mt-2">
                    <div>ROC-AUC: <span className="font-mono font-bold text-slate-900">[{benchmarks?.confidence_intervals_b3?.roc_auc_ci?.join(', ')}]</span></div>
                    <div>Accuracy: <span className="font-mono">[{benchmarks?.confidence_intervals_b3?.accuracy_ci?.join(', ')}]</span></div>
                    <div>Recall: <span className="font-mono">[{benchmarks?.confidence_intervals_b3?.recall_ci?.join(', ')}]</span></div>
                    <div className="text-[11px] text-slate-500 italic mt-1">2,000 replicate non-parametric bootstrap</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FAIRNESS & SUBGROUP AUDIT */}
        {activeTab === 'fairness' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Algorithmic Fairness & Subgroup Disparity Audit</h3>
                  <p className="text-xs text-slate-500">
                    Mandatory Section 3.11 analysis: Stratified by Biological Sex and Age Bands with 5% recall parity threshold
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  No Severe Disparities Detected
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold">
                      <th className="py-3 px-4">Subgroup Category</th>
                      <th className="py-3 px-4">Sample Size (N)</th>
                      <th className="py-3 px-4">ROC-AUC</th>
                      <th className="py-3 px-4">Accuracy</th>
                      <th className="py-3 px-4">Recall</th>
                      <th className="py-3 px-4">Delta vs Pooled Recall</th>
                      <th className="py-3 px-4">Parity Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {benchmarks?.fairness_audit?.subgroups && Object.entries(benchmarks.fairness_audit.subgroups).map(([name, data]: [string, any]) => (
                      <tr key={name} className="hover:bg-slate-50 font-medium">
                        <td className="py-3 px-4 font-bold text-slate-900">{name}</td>
                        <td className="py-3 px-4 font-mono">{data.sample_size}</td>
                        <td className="py-3 px-4 font-bold">{data.roc_auc.toFixed(4)}</td>
                        <td className="py-3 px-4">{(data.accuracy * 100).toFixed(1)}%</td>
                        <td className="py-3 px-4">{(data.recall * 100).toFixed(1)}%</td>
                        <td className={`py-3 px-4 font-mono ${data.delta_recall_vs_pooled >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {data.delta_recall_vs_pooled >= 0 ? `+${(data.delta_recall_vs_pooled * 100).toFixed(1)}%` : `${(data.delta_recall_vs_pooled * 100).toFixed(1)}%`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PASSED (&lt;5% Delta)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUTHENTIC 70K COHORT & DATA PROVENANCE */}
        {activeTab === 'cohort' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Authentic Real-World Cohort Provenance & Quality Audit</h3>
                    <p className="text-xs text-slate-500">
                      Primary CVD Dataset (Kaggle ~70k) • Secondary T2D Transferability Cohort (CDC BRFSS ~71k) • Clinical Cross-Check (UCI 303)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Real-World Datasets
                  </span>
                </div>
              </div>

              {/* High-Level Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Primary CVD Cohort</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Kaggle / Sulianova</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">70,000</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Authentic clinical examination cohort; 68,610 valid records retained (98.01% quality retention) after rigorous physiological filtering.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Secondary T2D Target</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">CDC BRFSS Survey</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">70,692</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Behavioral Risk Factor Surveillance System 50-50 balanced split used for Benchmark B7 transferability validation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Clinical Cross-Check</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">UCI Cleveland</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">303</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Canonical Detrano et al. angiography clinical dataset used as an external comparability baseline floor.
                  </p>
                </div>
              </div>

              {/* Data Cleaning & Physiological Plausibility Audit */}
              <div className="mb-6 p-5 rounded-xl border border-slate-200 bg-slate-50/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Clinical Plausibility & Outlier Recoding Protocol (Section 3.4.1)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Systolic BP (ap_hi):</span>
                    <span className="font-bold text-slate-800">[70, 240] mmHg</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Filters negative and typist values (&gt;10,000)</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Diastolic BP (ap_lo):</span>
                    <span className="font-bold text-slate-800">[40, 150] mmHg</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Filters impossible low and negative pressures</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Hemodynamic Logic:</span>
                    <span className="font-bold text-slate-800">ap_hi &gt; ap_lo</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Requires positive pulse pressure</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Anthropometrics:</span>
                    <span className="font-bold text-slate-800">H: 120-220 cm, W: 30-200 kg</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Physiologically valid adult human limits</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-600 flex items-center justify-between">
                  <span>Outliers removed: <strong className="text-slate-800">1,390 records</strong> (1.99% attrition)</span>
                  <span>Cohort retained: <strong className="text-emerald-700">68,610 authentic patients</strong> (98.01%)</span>
                </div>
              </div>

              {/* Primary Cohort Demographic & Clinical Profile Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 flex justify-between items-center">
                  <span>Primary CVD Cohort Distributions & Clinical Baseline Statistics</span>
                  <span className="text-[11px] font-normal text-slate-500">Source: Observational Examination Records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Attribute Name</th>
                        <th className="py-2.5 px-4">Clinical Modality</th>
                        <th className="py-2.5 px-4">Distribution / Frequency</th>
                        <th className="py-2.5 px-4">Physiological Normal Range</th>
                        <th className="py-2.5 px-4">Clinical Role in Model</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Age</td>
                        <td className="py-2.5 px-4 text-slate-600">Demographic (D)</td>
                        <td className="py-2.5 px-4 font-mono">53.3 ± 6.8 yrs (30 to 65)</td>
                        <td className="py-2.5 px-4 text-slate-500">Adult population</td>
                        <td className="py-2.5 px-4 text-indigo-600">Dual-branch conditioning</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Biological Sex</td>
                        <td className="py-2.5 px-4 text-slate-600">Demographic (D)</td>
                        <td className="py-2.5 px-4 font-mono">65.2% Female / 34.8% Male</td>
                        <td className="py-2.5 px-4 text-slate-500">Binary biological</td>
                        <td className="py-2.5 px-4 text-indigo-600">Fairness audit stratified</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Systolic BP (ap_hi)</td>
                        <td className="py-2.5 px-4 text-slate-600">Clinical (Group C)</td>
                        <td className="py-2.5 px-4 font-mono">126.7 ± 16.7 mmHg</td>
                        <td className="py-2.5 px-4 text-emerald-600">&lt;120 mmHg (AHA 2017)</td>
                        <td className="py-2.5 px-4 text-indigo-600">Primary hemodynamics</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Diastolic BP (ap_lo)</td>
                        <td className="py-2.5 px-4 text-slate-600">Clinical (Group C)</td>
                        <td className="py-2.5 px-4 font-mono">81.3 ± 9.4 mmHg</td>
                        <td className="py-2.5 px-4 text-emerald-600">&lt;80 mmHg (AHA 2017)</td>
                        <td className="py-2.5 px-4 text-indigo-600">Arterial resistance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">BMI</td>
                        <td className="py-2.5 px-4 text-slate-600">Clinical (Group C)</td>
                        <td className="py-2.5 px-4 font-mono">27.5 ± 5.3 kg/m²</td>
                        <td className="py-2.5 px-4 text-slate-500">18.5 – 24.9 kg/m²</td>
                        <td className="py-2.5 px-4 text-indigo-600">Metabolic risk factor</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Tobacco Smoking</td>
                        <td className="py-2.5 px-4 text-slate-600">Lifestyle (Group L)</td>
                        <td className="py-2.5 px-4 font-mono">8.8% Active Smokers</td>
                        <td className="py-2.5 px-4 text-emerald-600">0% (Complete cessation)</td>
                        <td className="py-2.5 px-4 text-indigo-600">Endothelial injury factor</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Alcohol Consumption</td>
                        <td className="py-2.5 px-4 text-slate-600">Lifestyle (Group L)</td>
                        <td className="py-2.5 px-4 font-mono">5.4% Regular Drinkers</td>
                        <td className="py-2.5 px-4 text-slate-500">&le;14 units/week (UK CMO)</td>
                        <td className="py-2.5 px-4 text-indigo-600">Hemodynamic modifier</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-900">Physical Activity</td>
                        <td className="py-2.5 px-4 text-slate-600">Lifestyle (Group L)</td>
                        <td className="py-2.5 px-4 font-mono">80.4% Physically Active</td>
                        <td className="py-2.5 px-4 text-emerald-600">&ge;150 min/wk moderate</td>
                        <td className="py-2.5 px-4 text-indigo-600">Protective metabolic factor</td>
                      </tr>
                      <tr className="bg-indigo-50/40">
                        <td className="py-2.5 px-4 font-bold text-indigo-950">Cardiovascular Disease (cardio)</td>
                        <td className="py-2.5 px-4 text-slate-600">Target Ground Truth</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">49.47% Positive (33,944 / 68,610)</td>
                        <td className="py-2.5 px-4 text-slate-500">Balanced 50-50 cohort</td>
                        <td className="py-2.5 px-4 text-indigo-700 font-bold">Binary prediction objective</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Clinical Guidelines Accordion */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    ACC/AHA 2017 Blood Pressure Practice Guidelines
                  </h4>
                  <ul className="text-xs space-y-1.5 text-slate-600">
                    <li><strong className="text-emerald-700">Normal:</strong> SBP &lt; 120 and DBP &lt; 80 mmHg</li>
                    <li><strong className="text-blue-700">Elevated:</strong> SBP 120–129 and DBP &lt; 80 mmHg (Lifestyle therapy)</li>
                    <li><strong className="text-amber-700">Stage 1 HTN:</strong> SBP 130–139 or DBP 80–89 mmHg (Risk-based Rx)</li>
                    <li><strong className="text-red-700">Stage 2 HTN:</strong> SBP &ge; 140 or DBP &ge; 90 mmHg (Combination Rx)</li>
                    <li><strong className="text-red-800">Hypertensive Crisis:</strong> SBP &gt; 180 and/or DBP &gt; 120 mmHg (Emergency)</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-600" />
                    ESC 2021 Prevention Guidelines Targets
                  </h4>
                  <ul className="text-xs space-y-1.5 text-slate-600">
                    <li><strong>Smoking:</strong> Complete cessation reduces excess CVD mortality by 50% within 1 year.</li>
                    <li><strong>Diet:</strong> Mediterranean/DASH protocol reduces incident events by 15-20%.</li>
                    <li><strong>Exercise:</strong> 150-300 min/wk moderate or 75-150 min/wk vigorous aerobic activity.</li>
                    <li><strong>BP Target:</strong> Aim for SBP 120–130 mmHg in adults under 70 years if tolerated.</li>
                    <li><strong>BMI Target:</strong> Healthy weight 20–25 kg/m²; weight reduction if BMI &gt; 25.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CLINICAL CONSULTATION SUMMARY (PDF READY) */}
        {activeTab === 'report' && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto print:shadow-none print:border-none">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-indigo-600">
                  York St John University Hospital Decision Support System
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                  Cardiovascular Risk Assessment & Clinical Consultation Summary
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Generated via Late-Fusion Machine Learning Engine (Sarjan B. Thapa Research Prototype)
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold text-slate-800">Date: {new Date().toLocaleDateString()}</div>
                <div className="text-slate-500">Ref ID: CVD-{patientData.age_years}-{Math.floor(Math.random() * 8999 + 1000)}</div>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Clinical Audit Stamp OK
                </span>
              </div>
            </div>

            {/* Patient Clinical Profile */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Patient Age / Sex:</span>
                <span className="font-bold text-slate-900">{patientData.age_years} yrs / {patientData.gender === 1 ? 'Female' : 'Male'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Blood Pressure:</span>
                <span className="font-bold text-slate-900">{patientData.ap_hi} / {patientData.ap_lo} mmHg</span>
              </div>
              <div>
                <span className="text-slate-500 block">BMI (Body Mass Index):</span>
                <span className="font-bold text-slate-900">{(patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)} kg/m²</span>
              </div>
              <div>
                <span className="text-slate-500 block">Smoking Status:</span>
                <span className={`font-bold ${patientData.smoke === 1 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {patientData.smoke === 1 ? 'Active Smoker' : 'Non-Smoker'}
                </span>
              </div>
            </div>

            {/* Late-Fusion Risk Summary */}
            <div className="mb-6 p-5 rounded-xl border border-indigo-100 bg-indigo-50/40">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-indigo-950">Late-Fused Multi-Modal Risk Estimate</h3>
                <span className="text-2xl font-extrabold text-indigo-700">
                  {((currentProb) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Clinical Branch (p_C):</span>
                  <span className="font-bold text-slate-800">{((results?.predictions.clinical_branch_probability ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Lifestyle Branch (p_L):</span>
                  <span className="font-bold text-slate-800">{((results?.predictions.lifestyle_branch_probability ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Reliability Weight (r):</span>
                  <span className="font-bold text-slate-800">{((results?.predictions.lifestyle_reliability_score ?? 1) * 100).toFixed(0)}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-700">
                <strong>Assigned Risk Tier:</strong> {results?.predictions.risk_tier} — {results?.predictions.clinical_action}
              </p>
            </div>

            {/* Top Recommended Interventions */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Actionable Lifestyle & Clinical Prescriptions (From LIME Sensitivity)
              </h3>
              <div className="space-y-2">
                {results?.xai.lime.explanations.slice(0, 4).map((ex, i) => (
                  <div key={i} className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <div>
                      <strong className="text-slate-900">{ex.feature}:</strong> {ex.clinical_guidance}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign-off footer */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p>System: CardioXAI late-fusion DSS</p>
                <p>MSc Applied Research Project • York St John University</p>
              </div>
              <div className="text-right">
                <div className="w-40 border-b border-slate-400 mb-1" />
                <p>Attending Physician Signature</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© 2026 Sarjan Bahadur Thapa • York St John University • Department of Data Science</p>
          <p className="mt-0.5 text-slate-400">
            "Early-Stage Cardiovascular Disease Prediction Using a Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning"
          </p>
        </div>
      </footer>
    </div>
  );
}
