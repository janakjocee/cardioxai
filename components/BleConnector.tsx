'use client';

import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  Activity,
  Heart,
  Battery,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Wifi,
  Radio,
  Zap,
  RefreshCw,
  Power
} from 'lucide-react';
import { WebBLEManager, BLEDeviceState, BLEHeartRateData, BLEBloodPressureData, isWebBluetoothSupported, globalBLEManager } from '@/lib/ble';

interface BleConnectorProps {
  onLiveVitalsReceived?: (vitals: { sbp?: number; dbp?: number; hr?: number }) => void;
}

export function BleConnector({ onLiveVitalsReceived }: BleConnectorProps) {
  const manager = globalBLEManager;
  const [bleState, setBleState] = useState<BLEDeviceState>(manager.getState());
  const [supported, setSupported] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [latestHR, setLatestHR] = useState<BLEHeartRateData | null>(null);
  const [latestBP, setLatestBP] = useState<BLEBloodPressureData | null>(null);

  useEffect(() => {
    setSupported(isWebBluetoothSupported());

    manager.onStateChange(st => setBleState(st));

    manager.onHeartRate(hr => {
      setLatestHR(hr);
      if (onLiveVitalsReceived) {
        onLiveVitalsReceived({ hr: hr.heartRate });
      }
    });

    manager.onBloodPressure(bp => {
      setLatestBP(bp);
      if (onLiveVitalsReceived) {
        onLiveVitalsReceived({ sbp: bp.systolic, dbp: bp.diastolic, hr: bp.pulseRate });
      }
    });
  }, [manager, onLiveVitalsReceived]);

  const handleConnect = async () => {
    setConnecting(true);
    await manager.requestPeripheral();
    setConnecting(false);
  };

  const handleDisconnect = () => {
    manager.disconnect();
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            bleState.connected ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Bluetooth className={`w-6 h-6 ${bleState.connected ? 'animate-pulse text-indigo-600' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Physical Medical Peripheral Connector</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                bleState.connected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {bleState.connected ? 'Connected (GATT Stream Active)' : 'Standby / Disconnected'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bluetooth SIG GATT 0x180D (Heart Rate) &amp; 0x1810 (Blood Pressure) Peripheral Bridge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bleState.connected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              Disconnect Device
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting || !supported}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
              {connecting ? 'Scanning for Peripherals...' : 'Pair Bluetooth Sensor'}
            </button>
          )}
        </div>
      </div>

      {!supported && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="font-bold">Browser Web Bluetooth Notice:</strong> Web Bluetooth requires a compatible browser (Google Chrome, Microsoft Edge, or Opera on Mac/Windows/Android/ChromeOS). On iOS, pair via Safari WebKit bridge or companion app.
          </div>
        </div>
      )}

      {bleState.lastError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{bleState.lastError}</span>
        </div>
      )}

      {/* Connected Device Info Strip */}
      {bleState.connected ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Connected Peripheral:</span>
            <span className="font-bold text-slate-900">{bleState.deviceName}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">GATT Profiles Discovered:</span>
            <span className="font-bold text-indigo-700">{bleState.servicesFound.join(', ') || 'Standard GATT'}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Battery Level:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Battery className="w-4 h-4 text-emerald-600" />
              {bleState.batteryLevel !== null ? `${bleState.batteryLevel}%` : 'Normal'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
          <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700">Supported Hardware Peripherals</h4>
          <p className="text-[11px] text-slate-400 mt-1 max-w-lg mx-auto">
            Compatible with any Bluetooth SIG compliant sensor: <strong>Omron Evolv / 10 Series</strong>, <strong>Withings BPM Connect</strong>, <strong>Polar H10 / OH1</strong>, <strong>Garmin HRM-Pro</strong>, and standard BLE pulse oximeters.
          </p>
        </div>
      )}

      {/* Live Stream Telemetry from Physical Peripherals */}
      {(latestHR || latestBP) && (
        <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              Live Ingested Peripheral Measurements
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Auto-updating CardioXAI Late-Fusion inputs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {latestHR && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Live Heart Rate</span>
                <span className="text-xl font-black text-rose-600 flex items-center gap-1 mt-0.5">
                  <Heart className="w-4 h-4 animate-pulse fill-rose-500 text-rose-500" />
                  {latestHR.heartRate} <span className="text-xs font-normal text-slate-500">bpm</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Sensor Contact: {latestHR.contactDetected ? 'Good' : 'Detected'}
                </span>
              </div>
            )}

            {latestBP && (
              <>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Systolic BP</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {latestBP.systolic} <span className="text-xs font-normal text-slate-500">mmHg</span>
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Diastolic BP</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {latestBP.diastolic} <span className="text-xs font-normal text-slate-500">mmHg</span>
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">MAP (Calculated)</span>
                  <span className="text-xl font-black text-indigo-700 mt-0.5 block">
                    {latestBP.meanArterialPressure} <span className="text-xs font-normal text-slate-500">mmHg</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
