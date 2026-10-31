'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Zap,
  ShieldCheck,
  Heart,
  TrendingUp,
  Cpu,
  Wifi,
  Radio,
  Clock,
  Bluetooth,
  Power,
  Battery,
  Info,
  CheckCircle2
} from 'lucide-react';
import {
  TelemetryReading,
  TelemetryScenario,
  TelemetryStreamSimulator,
  evaluateRealHardwareTelemetry
} from '@/lib/telemetry';
import { globalBLEManager, isWebBluetoothSupported, BLEDeviceState } from '@/lib/ble';
import { RiskGauge } from '@/components/ui';

interface RealTimeMonitorProps {
  onRecordAudit?: (reading: TelemetryReading) => void;
}

export function RealTimeMonitor({ onRecordAudit }: RealTimeMonitorProps) {
  // Mode selection: Physical Hardware (Default) vs Synthetic Simulation
  const [activeMode, setActiveMode] = useState<'hardware' | 'simulation'>('hardware');

  // --- HARDWARE STATE ---
  const [bleState, setBleState] = useState<BLEDeviceState>(globalBLEManager.getState());
  const [isSupported, setIsSupported] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [hardwareReading, setHardwareReading] = useState<TelemetryReading | null>(null);
  const [hardwareHistory, setHardwareHistory] = useState<TelemetryReading[]>([]);
  const lastKnownBpRef = useRef<{ sbp: number; dbp: number }>({ sbp: 128, dbp: 82 });
  const tickCounterRef = useRef<number>(0);

  // --- SIMULATION STATE (Opt-in Demo) ---
  const [simRunning, setSimRunning] = useState(false); // Paused by default
  const [scenario, setScenario] = useState<TelemetryScenario>('hypertensive_surge');
  const [simHistory, setSimHistory] = useState<TelemetryReading[]>([]);
  const [simReading, setSimReading] = useState<TelemetryReading | null>(null);
  const [activeAlert, setActiveAlert] = useState<TelemetryReading['prediction']['alert'] | null>(null);
  const [showSbar, setShowSbar] = useState(false);

  const simRef = useRef<TelemetryStreamSimulator>(new TelemetryStreamSimulator('hypertensive_surge'));

  // Initialize Web Bluetooth listeners
  useEffect(() => {
    setIsSupported(isWebBluetoothSupported());

    globalBLEManager.onStateChange(st => {
      setBleState(st);
      if (!st.connected) {
        setHardwareReading(null);
      }
    });

    // Real Characteristic Notifications (0x2A37 Heart Rate)
    globalBLEManager.onHeartRate(hrData => {
      tickCounterRef.current += 1;
      const reading = evaluateRealHardwareTelemetry({
        hr: hrData.heartRate,
        sbp: lastKnownBpRef.current.sbp,
        dbp: lastKnownBpRef.current.dbp,
        sensorQuality: hrData.contactDetected ? 1.0 : 0.85,
        tick: tickCounterRef.current
      });

      setHardwareReading(reading);
      setHardwareHistory(prev => {
        const next = [...prev, reading];
        return next.length > 30 ? next.slice(-30) : next;
      });

      if (onRecordAudit && tickCounterRef.current % 5 === 0) {
        onRecordAudit(reading);
      }
    });

    // Real Characteristic Notifications (0x2A35 Blood Pressure)
    globalBLEManager.onBloodPressure(bpData => {
      lastKnownBpRef.current = { sbp: bpData.systolic, dbp: bpData.diastolic };
      tickCounterRef.current += 1;

      const reading = evaluateRealHardwareTelemetry({
        hr: bpData.pulseRate || (hardwareReading?.heart_rate ?? 72),
        sbp: bpData.systolic,
        dbp: bpData.diastolic,
        sensorQuality: 1.0,
        tick: tickCounterRef.current
      });

      setHardwareReading(reading);
      setHardwareHistory(prev => {
        const next = [...prev, reading];
        return next.length > 30 ? next.slice(-30) : next;
      });

      if (onRecordAudit) {
        onRecordAudit(reading);
      }
    });
  }, [hardwareReading, onRecordAudit]);

  // Simulation tick loop (only runs if user explicitly switched to simulation AND started it)
  useEffect(() => {
    if (activeMode !== 'simulation' || !simRunning) return;

    simRef.current.setScenario(scenario);

    const interval = setInterval(() => {
      const reading = simRef.current.nextTick();
      setSimReading(reading);
      if (reading.prediction.alert) {
        setActiveAlert(reading.prediction.alert);
      }
      setSimHistory(prev => {
        const next = [...prev, reading];
        return next.length > 30 ? next.slice(-30) : next;
      });

      if (onRecordAudit && reading.tick % 5 === 0) {
        onRecordAudit(reading);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMode, simRunning, scenario, onRecordAudit]);

  const handleConnectHardware = async () => {
    setConnecting(true);
    await globalBLEManager.requestPeripheral();
    setConnecting(false);
  };

  const handleDisconnectHardware = () => {
    globalBLEManager.disconnect();
    setHardwareReading(null);
  };

  const resetSimStream = () => {
    simRef.current = new TelemetryStreamSimulator(scenario);
    setSimHistory([]);
    setSimReading(null);
    setActiveAlert(null);
  };

  // Determine current active reading based on mode
  const currentReading = activeMode === 'hardware' ? hardwareReading : simReading;
  const currentHistory = activeMode === 'hardware' ? hardwareHistory : simHistory;
  const isDeviceConnected = activeMode === 'hardware' && bleState.connected;

  return (
    <div className="space-y-6">
      {/* Operating Mode Selector Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Telemetry Data Source</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-medium">
                Clinical Transparency Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select between actual physical Bluetooth medical hardware or pre-recorded synthetic validation benchmarks
            </p>
          </div>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
          <button
            onClick={() => setActiveMode('hardware')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeMode === 'hardware'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            Physical BLE Hardware (Real)
          </button>
          <button
            onClick={() => setActiveMode('simulation')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeMode === 'simulation'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Stress-Test Benchmark (Demo)
          </button>
        </div>
      </div>

      {/* MODE 1: PHYSICAL HARDWARE PANEL */}
      {activeMode === 'hardware' && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl border ${
                bleState.connected
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                <Bluetooth className={`w-6 h-6 ${bleState.connected ? 'animate-pulse text-emerald-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Physical Medical Sensor Interface</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    bleState.connected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {bleState.connected ? 'GATT STREAM ACTIVE' : 'NO HARDWARE CONNECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct browser connection via Bluetooth SIG GATT 0x180D (Heart Rate) and 0x1810 (Blood Pressure)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {bleState.connected ? (
                <button
                  onClick={handleDisconnectHardware}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" />
                  Disconnect Peripheral
                </button>
              ) : (
                <button
                  onClick={handleConnectHardware}
                  disabled={connecting || !isSupported}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/50 transition-all disabled:opacity-50"
                >
                  <Bluetooth className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} />
                  {connecting ? 'Scanning for Peripherals...' : 'Connect Physical Bluetooth Device'}
                </button>
              )}
            </div>
          </div>

          {!isSupported && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Web Bluetooth requires Google Chrome, Microsoft Edge, or Opera on macOS, Windows, Android, or ChromeOS.</span>
            </div>
          )}

          {bleState.lastError && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{bleState.lastError}</span>
            </div>
          )}

          {bleState.connected && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-800">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400">Device Name:</span>
                <span className="font-bold text-white">{bleState.deviceName}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400">GATT Services:</span>
                <span className="font-bold text-indigo-300">{bleState.servicesFound.join(', ') || '0x180D'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400">Battery:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5" />
                  {bleState.batteryLevel !== null ? `${bleState.batteryLevel}%` : 'Normal'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: SIMULATION CONTROLS (Only visible in Simulation Mode) */}
      {activeMode === 'simulation' && (
        <div className="bg-amber-950/40 text-amber-100 rounded-2xl p-5 border border-amber-800/60 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Pre-Programmed Clinical Stress-Test Simulation</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                    SYNTHETIC BENCHMARK
                  </span>
                </div>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Used for validating mathematical sliding-window responses without needing live hardware
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={scenario}
                onChange={e => {
                  setScenario(e.target.value as TelemetryScenario);
                  resetSimStream();
                }}
                className="bg-amber-900/60 border border-amber-700 text-xs rounded-xl px-3 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="hypertensive_surge">Scenario: Acute Hypertensive Crisis</option>
                <option value="post_infarction_recovery">Scenario: Post-MI Therapy Recovery</option>
                <option value="sensor_artifact_noise">Scenario: Sensor Noise & Reliability Decay</option>
                <option value="ambulatory_circadian_normal">Scenario: Normal Diurnal Rhythm</option>
              </select>

              <button
                onClick={() => setSimRunning(!simRunning)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  simRunning
                    ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-sm'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                }`}
              >
                {simRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {simRunning ? 'Pause Simulation' : 'Start Simulation'}
              </button>

              <button
                onClick={resetSimStream}
                className="p-2 rounded-xl bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200 transition-colors"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-900/40 border border-amber-700/60 text-xs text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Academic Transparency Notice:</strong> Readings in this tab are generated by a synthetic clinical test harness to demonstrate real-time sliding hemodynamics (MAP, RPP, and dynamic reliability weighting $r$). To see real unsimulated numbers, switch to <strong>Physical BLE Hardware</strong> mode and pair a real sensor.
            </div>
          </div>
        </div>
      )}

      {/* SBAR EMERGENCY PROTOCOL BANNER (If Active in Simulation) */}
      {activeAlert && activeMode === 'simulation' && (
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
              <div><strong>Assessment:</strong> Fused probability {((currentReading?.prediction.fused_probability ?? 0) * 100).toFixed(1)}%. Late-fusion reliability weighting adjusted to {((currentReading?.derived.reliability_score ?? 1) * 100).toFixed(0)}%.</div>
              <div><strong>Recommendation:</strong> Titrate IV labetalol to attenuate acute myocardial oxygen demand (RPP: {currentReading?.derived.rpp}).</div>
            </div>
          )}
        </div>
      )}

      {/* VITAL SIGNS METRIC TICKER (HONEST NO-HARDWARE DISPLAY) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Blood Pressure */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Blood Pressure</span>
            <Activity className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {currentReading ? `${currentReading.ap_hi} / ${currentReading.ap_lo}` : (
              <span className="text-slate-300 font-mono text-lg">-- / --</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentReading ? 'mmHg (Sys / Dia)' : 'Awaiting sensor'}
          </div>
        </div>

        {/* Heart Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Heart Rate</span>
            <Heart className={`w-3.5 h-3.5 ${currentReading ? 'text-red-500 animate-pulse fill-red-500' : 'text-slate-300'}`} />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {currentReading ? (
              <span>{currentReading.heart_rate} <span className="text-xs font-normal text-slate-500">bpm</span></span>
            ) : (
              <span className="text-slate-300 font-mono text-lg">-- bpm</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentReading ? 'Raw BLE Characteristic' : 'No peripheral'}
          </div>
        </div>

        {/* Mean Arterial Pressure (MAP) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Mean Arterial (MAP)</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {currentReading ? (
              <span>{currentReading.derived.map} <span className="text-xs font-normal text-slate-500">mmHg</span></span>
            ) : (
              <span className="text-slate-300 font-mono text-lg">-- mmHg</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentReading ? 'Target >65 mmHg' : 'DBP + PP/3'}
          </div>
        </div>

        {/* Pulse Pressure */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Pulse Pressure</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {currentReading ? (
              <span>{currentReading.derived.pulse_pressure} <span className="text-xs font-normal text-slate-500">mmHg</span></span>
            ) : (
              <span className="text-slate-300 font-mono text-lg">-- mmHg</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentReading ? 'Arterial stiffness index' : 'SBP - DBP'}
          </div>
        </div>

        {/* Rate Pressure Product */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Rate Pressure (RPP)</span>
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {currentReading ? currentReading.derived.rpp : (
              <span className="text-slate-300 font-mono text-lg">--</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentReading ? 'Myocardial O₂ demand' : '(HR × SBP) / 100'}
          </div>
        </div>

        {/* Reliability Score r */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase font-semibold">
            <span>Reliability ($r$)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {currentReading ? `${(currentReading.derived.reliability_score * 100).toFixed(0)}%` : (
              <span className="text-slate-300 font-mono text-lg">0%</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentReading ? 'Sensor Contact Quality' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* MAIN SPLIT: RISK GAUGE + LIVE WAVEFORM STRIP */}
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
            {currentReading ? (
              <RiskGauge
                probability={currentReading.prediction.fused_probability}
                tier={currentReading.prediction.risk_tier}
                size="lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                <Radio className="w-10 h-10 text-slate-300 mb-2" />
                <span className="font-semibold text-slate-600">Awaiting Live Telemetry</span>
                <span className="text-[11px] text-slate-400 mt-1">Connect a Bluetooth sensor to calculate risk in real-time</span>
              </div>
            )}
          </div>

          <div className="w-full space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Clinical Branch ($p_C$):</span>
              <span className="font-bold text-slate-900">
                {currentReading ? `${(currentReading.prediction.clinical_branch_prob * 100).toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Lifestyle Branch ($p_L$):</span>
              <span className="font-bold text-slate-900">
                {currentReading ? `${(currentReading.prediction.lifestyle_branch_prob * 100).toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Late-Fusion Reliability ($r$):</span>
              <span className="font-bold text-emerald-700">
                {currentReading ? `${(currentReading.derived.reliability_score * 100).toFixed(0)}%` : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Trajectory Waveform Graph */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className={`w-4 h-4 ${currentReading ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                Live Hemodynamic &amp; Risk Trajectory Strip
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeMode === 'hardware'
                  ? 'Real-time telemetry buffer strictly plotting physical GATT Bluetooth packet notifications'
                  : 'Displaying synthetic sliding-window benchmark ticks (1.0 Hz stress-test)'}
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
              {currentReading ? `Tick #${currentReading.tick}` : 'Buffer Empty'}
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

            {/* Standby Message if Disconnected */}
            {!currentReading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs z-20 pointer-events-none">
                <Bluetooth className="w-8 h-8 text-slate-700 mb-2" />
                <span className="font-semibold text-slate-400">Telemetry Stream Inactive</span>
                <span className="text-[11px] text-slate-600 mt-0.5">
                  {activeMode === 'hardware'
                    ? 'Connect a Bluetooth peripheral to stream live vitals with zero synthetic noise'
                    : 'Click "Start Simulation" to run synthetic stress tests'}
                </span>
              </div>
            )}

            {/* SVG Lines */}
            <svg className="w-full h-full relative z-10" viewBox="0 0 300 120" preserveAspectRatio="none">
              {/* SBP Waveform (Cyan) */}
              {currentHistory.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  points={currentHistory.map((pt, idx) => {
                    const x = (idx / (Math.max(1, currentHistory.length - 1))) * 300;
                    const y = 120 - Math.min(110, Math.max(10, ((pt.ap_hi - 90) / 110) * 100));
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}

              {/* Fused Risk Waveform (Red/Amber) */}
              {currentHistory.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  points={currentHistory.map((pt, idx) => {
                    const x = (idx / (Math.max(1, currentHistory.length - 1))) * 300;
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
                  <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                  Systolic BP: {currentReading ? `${currentReading.ap_hi} mmHg` : '--'}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-0.5 bg-red-400 inline-block border-dashed" />
                  Fused Risk: {currentReading ? `${(currentReading.prediction.fused_probability * 100).toFixed(1)}%` : '--'}
                </span>
              </div>
              <span className="text-slate-500">Live Buffer: {currentHistory.length} pts</span>
            </div>
          </div>

          {/* Bottom Context Info */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {activeMode === 'hardware'
                ? 'Deterministic Hardware Stream: Updates strictly on real physical characteristic notifications'
                : 'Controlled Benchmark: Demonstrates sliding-window dynamics and SBAR alerts'}
            </span>
            {activeMode === 'hardware' && !bleState.connected && (
              <button
                onClick={handleConnectHardware}
                disabled={connecting || !isSupported}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Pair Sensor Now →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
