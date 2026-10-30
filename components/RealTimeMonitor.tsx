'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Heart,
  TrendingUp,
  Cpu,
  Wifi,
  Radio,
  FileCheck2,
  Clock
} from 'lucide-react';
import { TelemetryReading, TelemetryScenario, TelemetryStreamSimulator } from '@/lib/telemetry';
import { RiskGauge } from '@/components/ui';

interface RealTimeMonitorProps {
  onRecordAudit?: (reading: TelemetryReading) => void;
}

export function RealTimeMonitor({ onRecordAudit }: RealTimeMonitorProps) {
  const [isRunning, setIsRunning] = useState(true);
  const [scenario, setScenario] = useState<TelemetryScenario>('hypertensive_surge');
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [latestReading, setLatestReading] = useState<TelemetryReading | null>(null);
  const [activeAlert, setActiveAlert] = useState<TelemetryReading['prediction']['alert'] | null>(null);
  const [showSbar, setShowSbar] = useState(false);

  const simRef = useRef<TelemetryStreamSimulator>(new TelemetryStreamSimulator('hypertensive_surge'));

  useEffect(() => {
    simRef.current.setScenario(scenario);
  }, [scenario]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const reading = simRef.current.nextTick();
      setLatestReading(reading);
      if (reading.prediction.alert) {
        setActiveAlert(reading.prediction.alert);
      }
      setHistory(prev => {
        const next = [...prev, reading];
        return next.length > 30 ? next.slice(-30) : next;
      });

      if (onRecordAudit && reading.tick % 5 === 0) {
        onRecordAudit(reading);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onRecordAudit]);

  const resetStream = () => {
    simRef.current = new TelemetryStreamSimulator(scenario);
    setHistory([]);
    setLatestReading(null);
    setActiveAlert(null);
  };

  const currentRisk = latestReading?.prediction.fused_probability ?? 0.58;
  const currentTier = latestReading?.prediction.risk_tier ?? 'Moderate Risk';

  return (
    <div className="space-y-6">
      {/* Real-Time Control & Telemetry Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center p-3 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
              <Activity className="w-6 h-6 animate-pulse" />
              {isRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Live Ambulatory Telemetry Stream</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isRunning ? '1.0 Hz REAL-TIME' : 'STREAM PAUSED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuous late-fusion multi-modal telemetry integration • Dynamic reliability weighting $r$
              </p>
            </div>
          </div>

          {/* Stream Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scenario}
              onChange={e => {
                setScenario(e.target.value as TelemetryScenario);
                resetStream();
              }}
              className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="hypertensive_surge">Scenario: Acute Hypertensive Crisis</option>
              <option value="post_infarction_recovery">Scenario: Post-MI Therapy Recovery</option>
              <option value="sensor_artifact_noise">Scenario: Sensor Noise & Reliability Decay</option>
              <option value="ambulatory_circadian_normal">Scenario: Normal Diurnal Rhythm</option>
            </select>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isRunning
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600/50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? 'Pause Stream' : 'Resume Stream'}
            </button>

            <button
              onClick={resetStream}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset Stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Alert Banner (NEWS2 / Emergency SBAR) */}
      {activeAlert && (
        <div className={`rounded-2xl p-4 border transition-all ${
          activeAlert.level === 'CRITICAL'
            ? 'bg-red-50 border-red-300 text-red-900'
            : activeAlert.level === 'WARNING'
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                activeAlert.level === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    activeAlert.level === 'CRITICAL' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {activeAlert.type.replace('_', ' ')}
                  </span>
                  <h4 className="text-xs font-bold">{activeAlert.headline}</h4>
                </div>
                <p className="text-xs mt-1 opacity-90">{activeAlert.sbar_recommendation}</p>
              </div>
            </div>

            <button
              onClick={() => setShowSbar(!showSbar)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/80 border border-slate-300 hover:bg-white text-slate-800 whitespace-nowrap shadow-sm"
            >
              {showSbar ? 'Hide SBAR Protocol' : 'View SBAR Protocol'}
            </button>
          </div>

          {showSbar && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs bg-white/70 p-3 rounded-xl space-y-1.5">
              <div className="font-mono text-[11px] text-slate-600">WHO/NHS SBAR Structured Emergency Handover:</div>
              <div><strong>Situation:</strong> Patient exhibiting sudden hemodynamic decompensation.</div>
              <div><strong>Background:</strong> Stage 2 HTN with active tobacco consumption. Fused risk in Critical Stage.</div>
              <div><strong>Assessment:</strong> Fused probability {((latestReading?.prediction.fused_probability ?? 0) * 100).toFixed(1)}%. Late-fusion reliability weighting adjusted to {((latestReading?.derived.reliability_score ?? 1) * 100).toFixed(0)}%.</div>
              <div><strong>Recommendation:</strong> Titrate IV labetalol to attenuate acute myocardial oxygen demand (RPP: {latestReading?.derived.rpp}).</div>
            </div>
          )}
        </div>
      )}

      {/* Vital Signs Real-Time Metric Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Blood Pressure</span>
            <Activity className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {latestReading?.ap_hi ?? 135} / {latestReading?.ap_lo ?? 86}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">mmHg (Sys / Dia)</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Heart Rate</span>
            <Heart className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {latestReading?.heart_rate ?? 72} <span className="text-xs font-normal text-slate-500">bpm</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sinus rhythm</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Mean Arterial (MAP)</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {latestReading?.derived.map ?? 102.3} <span className="text-xs font-normal text-slate-500">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Perfusion target &gt;65</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Pulse Pressure</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {latestReading?.derived.pulse_pressure ?? 49} <span className="text-xs font-normal text-slate-500">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Arterial stiffness</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Rate Pressure (RPP)</span>
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {latestReading?.derived.rpp ?? 97}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Myocardial O₂ index</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Reliability (r)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {((latestReading?.derived.reliability_score ?? 1.0) * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">PPG Contact Quality</div>
        </div>
      </div>

      {/* Main Split: Real-Time Risk Gauge + Live Telemetry Waveform */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instantaneous Fused Risk Gauge */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
              Instantaneous Late-Fusion Assessment
            </span>
            <h4 className="text-sm font-bold text-slate-900">Real-Time Cardiovascular Risk</h4>
          </div>

          <div className="my-4">
            <RiskGauge probability={currentRisk} tier={currentTier} size="lg" />
          </div>

          <div className="w-full space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Clinical Branch ($p_C$):</span>
              <span className="font-bold text-slate-900">{((latestReading?.prediction.clinical_branch_prob ?? 0.61) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Lifestyle Branch ($p_L$):</span>
              <span className="font-bold text-slate-900">{((latestReading?.prediction.lifestyle_branch_prob ?? 0.52) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Late-Fusion Reliability ($r$):</span>
              <span className="font-bold text-emerald-700">{((latestReading?.derived.reliability_score ?? 1.0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Live Trajectory Waveform Graph */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                Live Hemodynamic &amp; Risk Trajectory Strip
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displaying last 30 temporal ticks • Sliding 5-point moving SBP and instantaneous fused risk
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
              Tick #{latestReading?.tick ?? 0}
            </span>
          </div>

          {/* SVG Waveform Chart */}
          <div className="relative w-full h-48 my-3 bg-slate-950 rounded-xl p-3 overflow-hidden flex flex-col justify-between border border-slate-800">
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 pointer-events-none opacity-20">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-t border-l border-emerald-500" />
              ))}
            </div>

            {/* SVG Lines */}
            <svg className="w-full h-full relative z-10" viewBox="0 0 300 120" preserveAspectRatio="none">
              {/* SBP Waveform (Cyan) */}
              {history.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  points={history.map((pt, idx) => {
                    const x = (idx / (Math.max(1, history.length - 1))) * 300;
                    // SBP mapped from 90 to 200 mmHg -> 120 to 10
                    const y = 120 - Math.min(110, Math.max(10, ((pt.ap_hi - 90) / 110) * 100));
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}

              {/* Fused Risk Waveform (Red/Amber) */}
              {history.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  points={history.map((pt, idx) => {
                    const x = (idx / (Math.max(1, history.length - 1))) * 300;
                    // Risk mapped from 0 to 1.0 -> 110 to 10
                    const y = 110 - (pt.prediction.fused_probability * 95);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}
            </svg>

            {/* Legend inside canvas */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 z-20">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Systolic BP ({latestReading?.ap_hi ?? 135} mmHg)
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-0.5 bg-red-400 inline-block border-dashed" /> Fused CVD Risk ({((currentRisk) * 100).toFixed(1)}%)
                </span>
              </div>
              <span className="text-slate-500">Live Buffer: {history.length} pts</span>
            </div>
          </div>

          {/* Interactive Simulation Injections */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Real-Time Clinical Triggers:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setScenario('hypertensive_surge');
                  resetStream();
                }}
                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-medium transition-colors"
              >
                Trigger Acute HTN Surge
              </button>
              <button
                onClick={() => {
                  setScenario('post_infarction_recovery');
                  resetStream();
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium transition-colors"
              >
                Inject Antihypertensive Response
              </button>
              <button
                onClick={() => {
                  setScenario('sensor_artifact_noise');
                  resetStream();
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-medium transition-colors"
              >
                Degrade Sensor Contact (Test $r$)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
