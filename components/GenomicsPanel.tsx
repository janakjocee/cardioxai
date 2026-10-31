'use client';

import React, { useState, useEffect } from 'react';
import {
  Dna,
  ShieldCheck,
  AlertTriangle,
  Award,
  TrendingUp,
  Info,
  CheckCircle2,
  ChevronRight,
  Activity
} from 'lucide-react';
import { evaluateGenomicModality, GenomicSNPInput, GenomicRiskAssessment } from '@/lib/genomics';

interface GenomicsPanelProps {
  onGenomicProbChange?: (p_g: number) => void;
}

export function GenomicsPanel({ onGenomicProbChange }: GenomicsPanelProps) {
  const [snpInput, setSnpInput] = useState<GenomicSNPInput>({
    snp_9p21_rs10757274: 1,
    snp_lpa_rs10455872: 0,
    apoe_genotype: 'e3/e3',
    family_history_premature_cad: false
  });

  const [assessment, setAssessment] = useState<GenomicRiskAssessment>(() => evaluateGenomicModality(snpInput));

  useEffect(() => {
    const res = evaluateGenomicModality(snpInput);
    setAssessment(res);
    if (onGenomicProbChange) {
      onGenomicProbChange(res.genetic_branch_prob);
    }
  }, [snpInput, onGenomicProbChange]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
            <Dna className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Branch 4: Multi-Omics Polygenic Risk Modality (f_G)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                GWAS PRS Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluating inherited susceptibility across 9p21.3 (rs10757274), LPA (rs10455872), and APOE alleles
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500 font-mono">Genetic Branch (p_G)</div>
          <div className="text-2xl font-black text-teal-700">
            {(assessment.genetic_branch_prob * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* SNP Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* 9p21.3 Locus */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="font-bold text-slate-900 block">
            Chromosome 9p21.3 (rs10757274)
          </label>
          <p className="text-[10px] text-slate-500">Primary coronary artery disease vascular senescence locus</p>
          <select
            value={snpInput.snp_9p21_rs10757274}
            onChange={e => setSnpInput({ ...snpInput, snp_9p21_rs10757274: Number(e.target.value) as 0 | 1 | 2 })}
            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={0}>0 Risk Alleles (G/G) — Low Risk</option>
            <option value={1}>1 Risk Allele (A/G) — Heterozygous (OR ~1.33)</option>
            <option value={2}>2 Risk Alleles (A/A) — Homozygous (OR ~1.77)</option>
          </select>
        </div>

        {/* LPA Variant */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="font-bold text-slate-900 block">
            LPA Variant (rs10455872)
          </label>
          <p className="text-[10px] text-slate-500">Atherogenic Lipoprotein(a) regulatory variant</p>
          <select
            value={snpInput.snp_lpa_rs10455872}
            onChange={e => setSnpInput({ ...snpInput, snp_lpa_rs10455872: Number(e.target.value) as 0 | 1 | 2 })}
            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={0}>0 Risk Alleles — Normal Lp(a)</option>
            <option value={1}>1 Risk Allele — Elevated Lp(a) (OR ~1.46)</option>
            <option value={2}>2 Risk Alleles — Severe Lp(a) (OR ~2.13)</option>
          </select>
        </div>

        {/* APOE Isoforms */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="font-bold text-slate-900 block">
            APOE Genotype Isoform
          </label>
          <p className="text-[10px] text-slate-500">Apolipoprotein E hepatic lipid clearance phenotype</p>
          <select
            value={snpInput.apoe_genotype}
            onChange={e => setSnpInput({ ...snpInput, apoe_genotype: e.target.value as any })}
            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="e3/e3">e3/e3 — Neutral wild-type</option>
            <option value="e3/e4">e3/e4 — Impaired clearance (OR ~1.38)</option>
            <option value="e4/e4">e4/e4 — High risk homozygous (OR ~1.90)</option>
            <option value="e2/e3">e2/e3 — Cardioprotective isoform</option>
          </select>
        </div>

        {/* Family History */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="font-bold text-slate-900 block">
            Premature Family CAD
          </label>
          <p className="text-[10px] text-slate-500">First-degree relative (&lt;55y male, &lt;65y female)</p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setSnpInput({ ...snpInput, family_history_premature_cad: false })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !snpInput.family_history_premature_cad
                  ? 'bg-teal-700 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Negative
            </button>
            <button
              onClick={() => setSnpInput({ ...snpInput, family_history_premature_cad: true })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                snpInput.family_history_premature_cad
                  ? 'bg-rose-700 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Positive
            </button>
          </div>
        </div>
      </div>

      {/* Genomic Risk Output Box */}
      <div className="p-5 rounded-xl bg-teal-50/40 border border-teal-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Population Polygenic Percentile
            </span>
            <div className="text-xl font-black text-teal-950 flex items-center gap-2 mt-0.5">
              <span>{assessment.prs_population_percentile}th Percentile</span>
              <span className="text-xs font-mono font-normal text-slate-600">
                (Z-Score: {assessment.prs_z_score > 0 ? `+${assessment.prs_z_score}` : assessment.prs_z_score})
              </span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            assessment.risk_category === 'VERY_HIGH_FAMILIAL_RISK'
              ? 'bg-red-100 text-red-800 border-red-300'
              : assessment.risk_category === 'HIGH_GENETIC_RISK'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {assessment.risk_category.replace(/_/g, ' ')}
          </span>
        </div>

        <p className="text-xs text-slate-700 italic">
          "{assessment.clinical_interpretation}"
        </p>

        {/* Allele Table */}
        <div className="pt-2 border-t border-teal-200/60 overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 border-b border-teal-200/40">
                <th className="py-1 px-2 font-semibold">Genomic Locus</th>
                <th className="py-1 px-2 font-semibold">Variant ID</th>
                <th className="py-1 px-2 font-semibold">Patient Genotype</th>
                <th className="py-1 px-2 font-semibold">Estimated Odds Ratio</th>
                <th className="py-1 px-2 font-semibold">Pathophysiological Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100 font-medium">
              {assessment.contributing_alleles.map((al, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 font-bold text-slate-900">{al.locus}</td>
                  <td className="py-1.5 px-2 font-mono text-slate-600">{al.variant_id}</td>
                  <td className="py-1.5 px-2">{al.patient_genotype}</td>
                  <td className="py-1.5 px-2 font-bold text-teal-800">{al.odds_ratio}x</td>
                  <td className="py-1.5 px-2 text-slate-600">{al.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
