'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface RiskGaugeProps {
  probability: number;
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const TIER_COLORS: Record<string, { stroke: string; bg: string; text: string; badge: string }> = {
  'Critical Stage Risk': {
    stroke: '#ef4444',
    bg: 'bg-red-50',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800 border-red-300'
  },
  'High Risk': {
    stroke: '#f59e0b',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  'Moderate Risk': {
    stroke: '#3b82f6',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  'Low Risk': {
    stroke: '#10b981',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  }
};

const SIZE_CONFIG = {
  sm: { viewBox: 120, cx: 60, cy: 60, r: 46, strokeWidth: 10, fontSize: 'text-lg' },
  md: { viewBox: 180, cx: 90, cy: 90, r: 70, strokeWidth: 12, fontSize: 'text-2xl' },
  lg: { viewBox: 220, cx: 110, cy: 110, r: 88, strokeWidth: 14, fontSize: 'text-4xl' }
};

export function RiskGauge({ probability, tier, size = 'lg', showLabel = true }: RiskGaugeProps) {
  const cfg = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * cfg.r;
  const offset = circumference - circumference * Math.min(1, Math.max(0, probability));
  const colors = TIER_COLORS[tier] ?? TIER_COLORS['Low Risk'];

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: cfg.viewBox, height: cfg.viewBox }}>
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${cfg.viewBox} ${cfg.viewBox}`}>
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            stroke="#e2e8f0"
            strokeWidth={cfg.strokeWidth}
            fill="transparent"
          />
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            stroke={colors.stroke}
            strokeWidth={cfg.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="text-center z-10">
          <div className={`font-black tracking-tight text-slate-900 ${cfg.fontSize}`}>
            {(probability * 100).toFixed(1)}%
          </div>
          {showLabel && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
              CVD Risk
            </div>
          )}
        </div>
      </div>
      {showLabel && (
        <span className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border ${colors.badge}`}>
          {tier}
        </span>
      )}
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string;
  format?: 'percent' | 'raw' | 'auc';
  delta?: number;
  description?: string;
  highlight?: boolean;
}

export function MetricCard({ label, value, format = 'raw', delta, description, highlight }: MetricCardProps) {
  const formatted =
    format === 'percent'
      ? `${((typeof value === 'number' ? value : 0) * 100).toFixed(1)}%`
      : format === 'auc'
      ? typeof value === 'number' ? value.toFixed(4) : value
      : value;

  return (
    <div className={`p-4 rounded-2xl border ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'} shadow-sm`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl font-black mt-1 ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{formatted}</div>
      {delta !== undefined && (
        <div className={`text-xs font-medium mt-0.5 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {delta >= 0 ? `+${(delta * 100).toFixed(2)}%` : `${(delta * 100).toFixed(2)}%`} vs baseline
        </div>
      )}
      {description && <div className="text-[10px] text-slate-400 mt-1">{description}</div>}
    </div>
  );
}

// ─── Probability Bar ────────────────────────────────────────────────────────

interface ProbBarProps {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}

export function ProbabilityBar({ label, value, color = 'bg-indigo-500', sublabel }: ProbBarProps) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
      {sublabel && <div className="text-[10px] text-slate-400 mt-0.5">{sublabel}</div>}
    </div>
  );
}

// ─── SHAP Waterfall Bar ──────────────────────────────────────────────────────

interface ShapBarProps {
  feature: string;
  value: number;
  patientValue: number | string;
  maxAbs: number;
}

export function ShapBar({ feature, value, patientValue, maxAbs }: ShapBarProps) {
  const isPositive = value >= 0;
  const widthPct = Math.min(100, (Math.abs(value) / maxAbs) * 100);

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-800 truncate max-w-[60%]">
          {feature} <span className="text-slate-400 font-normal">({patientValue})</span>
        </span>
        <span className={`font-bold text-xs ${isPositive ? 'text-red-600' : 'text-emerald-600'}`}>
          {isPositive ? `+${(value * 100).toFixed(2)}%` : `${(value * 100).toFixed(2)}%`}
        </span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className={`${isPositive ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Alert Banner ────────────────────────────────────────────────────────────

interface AlertBannerProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

const ALERT_STYLES = {
  info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-600', textColor: 'text-blue-800' },
  success: { bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600', textColor: 'text-emerald-800' },
  warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600', textColor: 'text-amber-800' },
  error: { bg: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-600', textColor: 'text-red-800' }
};

export function AlertBanner({ type, title, message }: AlertBannerProps) {
  const style = ALERT_STYLES[type];
  const Icon = style.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
      <div>
        <div className={`text-xs font-bold ${style.textColor}`}>{title}</div>
        <div className={`text-xs mt-0.5 ${style.textColor} opacity-90`}>{message}</div>
      </div>
    </div>
  );
}

// ─── Section Card wrapper ─────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, icon, badge, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
