/**
 * Multi-Omics Polygenic Risk Score (PRS) Modality for CardioXAI.
 * 
 * Standards & Evidence Base:
 * - Mega-GWAS Coronary Artery Disease (CARDIoGRAMplusC4D / UK Biobank)
 * - Canonical single nucleotide polymorphisms (SNPs):
 *   - rs10757274 (Chromosome 9p21.3 CDKN2A/B locus) - Primary arterial risk locus
 *   - rs10455872 (LPA Lipoprotein(a) regulatory variant)
 *   - APOE alleles (e2, e3, e4 lipid clearance phenotype)
 *   - rs688 (LDLR low-density lipoprotein receptor exon 12)
 * 
 * Implements Branch 4 (f_G) in the multi-modal Late-Fusion architecture,
 * evaluating baseline genetic susceptibility independently of dynamic lifestyle.
 */

export interface GenomicSNPInput {
  snp_9p21_rs10757274: 0 | 1 | 2; // Count of risk alleles (G/G=0, A/G=1, A/A=2)
  snp_lpa_rs10455872: 0 | 1 | 2;  // LPA variant risk allele count
  apoe_genotype: 'e3/e3' | 'e3/e4' | 'e4/e4' | 'e2/e3' | 'e2/e4';
  family_history_premature_cad: boolean; // First-degree relative (<55M, <65F)
}

export interface GenomicRiskAssessment {
  raw_prs_score: number;
  prs_population_percentile: number;
  prs_z_score: number;
  genetic_branch_prob: number;      // p_G in [0, 1]
  risk_category: 'LOW_GENETIC_RISK' | 'AVERAGE_GENETIC_RISK' | 'HIGH_GENETIC_RISK' | 'VERY_HIGH_FAMILIAL_RISK';
  clinical_interpretation: string;
  contributing_alleles: Array<{
    locus: string;
    variant_id: string;
    patient_genotype: string;
    odds_ratio: number;
    impact: string;
  }>;
}

// Effect sizes (log-odds beta) derived from CARDIoGRAMplusC4D GWAS meta-analyses
const BETA_9P21 = 0.285;   // OR ~ 1.33 per risk allele
const BETA_LPA = 0.380;    // OR ~ 1.46 per risk allele
const BETA_APOE_E4 = 0.320; // OR ~ 1.38 per e4 allele
const BETA_FAMILY_HX = 0.450; // Strong non-genotyped familial aggregation

/**
 * Computes calibrated Polygenic Risk Score and Genetic Branch Probability p_G.
 */
export function evaluateGenomicModality(input: GenomicSNPInput): GenomicRiskAssessment {
  let logOdds = -0.42; // Base population baseline log-odds for genetic susceptibility

  // 1. 9p21.3 risk allele contribution
  logOdds += input.snp_9p21_rs10757274 * BETA_9P21;

  // 2. LPA risk allele contribution
  logOdds += input.snp_lpa_rs10455872 * BETA_LPA;

  // 3. APOE phenotype
  let apoeCount = 0;
  if (input.apoe_genotype === 'e3/e4' || input.apoe_genotype === 'e2/e4') apoeCount = 1;
  if (input.apoe_genotype === 'e4/e4') apoeCount = 2;
  logOdds += apoeCount * BETA_APOE_E4;

  // 4. Clinical family history (encodes rare monogenic / polygenic background)
  if (input.family_history_premature_cad) {
    logOdds += BETA_FAMILY_HX;
  }

  // Logistic transform for genetic branch probability p_G
  const p_g = Math.round((1.0 / (1.0 + Math.exp(-logOdds))) * 1000) / 1000;

  // Population Z-score approximation
  const zScore = Math.round(((logOdds - (-0.42)) / 0.52) * 10) / 10;
  // Normal cumulative distribution for percentile
  const percentile = Math.min(99, Math.max(1, Math.round(normalCDF(zScore) * 100)));

  let riskCat: GenomicRiskAssessment['risk_category'] = 'AVERAGE_GENETIC_RISK';
  let interpretation = 'Average inherited susceptibility. Cardiovascular risk is predominantly conditioned by modifiable lifestyle and hemodynamics.';

  if (percentile >= 90 || input.snp_9p21_rs10757274 === 2 && input.snp_lpa_rs10455872 >= 1) {
    riskCat = 'VERY_HIGH_FAMILIAL_RISK';
    interpretation = 'Top decile genetic susceptibility. Arterial endothelium is highly vulnerable; recommend early aggressive lipid-lowering therapy regardless of baseline lifestyle.';
  } else if (percentile >= 75) {
    riskCat = 'HIGH_GENETIC_RISK';
    interpretation = 'Elevated polygenic predisposition. Modifiable lifestyle factors carry amplified leverage in counteracting inherited risk.';
  } else if (percentile <= 20) {
    riskCat = 'LOW_GENETIC_RISK';
    interpretation = 'Favorable genetic baseline. Modifiable behavioral habits will dictate whether clinical CVD manifests.';
  }

  return {
    raw_prs_score: Math.round(logOdds * 100) / 100,
    prs_population_percentile: percentile,
    prs_z_score: zScore,
    genetic_branch_prob: p_g,
    risk_category: riskCat,
    clinical_interpretation: interpretation,
    contributing_alleles: [
      {
        locus: 'Chromosome 9p21.3 (CDKN2A/B)',
        variant_id: 'rs10757274',
        patient_genotype: `${input.snp_9p21_rs10757274} risk alleles (A)`,
        odds_ratio: Math.round(Math.exp(input.snp_9p21_rs10757274 * BETA_9P21) * 100) / 100,
        impact: input.snp_9p21_rs10757274 > 0 ? 'Accelerates vascular cell senescence' : 'Neutral'
      },
      {
        locus: 'LPA Gene (Lipoprotein(a))',
        variant_id: 'rs10455872',
        patient_genotype: `${input.snp_lpa_rs10455872} risk alleles`,
        odds_ratio: Math.round(Math.exp(input.snp_lpa_rs10455872 * BETA_LPA) * 100) / 100,
        impact: input.snp_lpa_rs10455872 > 0 ? 'Elevated pro-thrombotic Lp(a) levels' : 'Neutral'
      },
      {
        locus: 'APOE Apolipoprotein E',
        variant_id: 'Epsilon Allele Isoforms',
        patient_genotype: input.apoe_genotype,
        odds_ratio: Math.round(Math.exp(apoeCount * BETA_APOE_E4) * 100) / 100,
        impact: apoeCount > 0 ? 'Impaired LDL receptor clearance' : 'Standard lipid metabolism'
      }
    ]
  };
}

function normalCDF(z: number): number {
  return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
}
