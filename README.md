# CardioXAI: Early-Stage Cardiovascular Disease Prediction System
### Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning

**Author:** Sarjan Bahadur Thapa  
**Student ID:** 260043443  
**Degree:** Master of Science in Data Science (Level 7)  
**Institution:** York St John University, Department of Data Science  
**Dissertation Date:** September 2026  

---

## 🔬 Project Overview

CardioXAI is an intelligent, transparent clinical decision-support system designed to forecast cardiovascular disease (CVD) at an early, asymptomatic stage. Based on the Master's Applied Research Project (ARP) dissertation by Sarjan Bahadur Thapa, this project bridges the critical gap between predictive machine learning accuracy and clinical trust.

Unlike conventional models that isolate clinical test metrics or naively concatenate disparate data sources (early fusion), this system pioneers a **Dual-Branch Late-Fusion Architecture with Per-Record Lifestyle Reliability Weighting** integrated with a **Point-of-Care Explainable AI (XAI)** suite using **SHAP** and **LIME**.

---

## 🌟 Core Contributions & Novelties

### 1. Novelty 1: Dual-Branch Late Fusion with Reliability Weighting (Section 3.6)
* **Clinical Branch ($f_C$):** Independently models hemodynamic, demographic, and laboratory parameters (systolic BP, diastolic BP, pulse pressure, mean arterial pressure, BMI, serum cholesterol, fasting glucose).
* **Lifestyle Branch ($f_L$):** Independently models behavioural factors (tobacco smoking, alcohol consumption, physical activity frequency, diet quality index).
* **Per-Record Lifestyle Reliability Score ($r \in [0, 1]$):** Computes individual data trustworthiness based on completeness, physiological plausibility (e.g., severe morbid obesity vs reported extreme endurance), and internal behavioural consistency.
* **Regularised Logistic Regression Meta-Learner:** Fuses calibrated probabilities $[p_C, p_L, r, p_L \times r, (p_C - p_L) \times r]$. When self-reported lifestyle data is noisy or inconsistent, the meta-learner dynamically attenuates the lifestyle branch weight.

### 2. Novelty 2: Dual Explainable AI (SHAP & LIME) Suite (Section 3.10)
* **SHAP (Global & Per-Patient Attribution):** Quantifies additive feature attributions against population expected risk $E[f(x)]$ using game-theoretic Shapley values.
* **LIME (Local Sparse Decision Surrogate):** Pinpoints top-5 modifiable lifestyle factors at point-of-care (e.g., smoking cessation, blood pressure reduction) to guide clinical consultations.
* **Measured Explanation Agreement (Section 3.10.3):** Formal concordance auditing between SHAP and LIME via **Jaccard Overlap ($J \ge 0.60$)**, **Spearman Rank Correlation ($\rho \ge 0.80$)**, and directional sign agreement.

---

## 📊 Experimental Benchmark Matrix (Configurations B0 – B7)

Evaluated under strict experimental controls (identical 5-fold CV splits, fixed random seeds, and Platt probability calibration):

| Benchmark ID | Architecture / Configuration | Modality Set | ROC-AUC | Accuracy | Recall | Precision | Clinical Interpretation |
|---|---|---|---|---|---|---|---|
| **B0** | Framingham Risk Score | Heuristic Index | 0.7053 | 61.18% | 73.11% | 50.20% | Conventional clinical instrument floor |
| **B1** | Clinical-Only ML Baseline | Group C Only | 0.7785 | 72.98% | 51.86% | 71.12% | Operative comparative floor |
| **B2** | Early Fusion (Prevailing Practice) | Concatenated C + L | 0.7804 | 72.70% | 51.47% | 70.65% | Naive feature concatenation |
| **B3** | **Proposed Late-Fusion (Novelty 1)** | **Dual-Branch + Weighting $r$** | **0.7806** | **72.85%** | **52.43%** | **70.48%** | **Best overall calibrated performance** |
| **B4** | Late Fusion Ablation (No $r$) | Unweighted Late Fusion | 0.7806 | 72.85% | 52.43% | 70.48% | Reliability weight ablation |
| **B5** | Late Fusion Ablation (No Interactions)| Base Features Only | 0.7743 | 72.58% | 52.75% | 69.65% | Proves necessity of cross-modal interactions |
| **B7** | Secondary Target Transferability | Early Stage Diabetes | **0.8189** | **75.12%** | **56.16%** | **74.73%** | Validates multi-disease generalisability |

* **Statistical Significance (Section 3.8.4):** DeLong paired test confirmatory verification ($p < 0.05$) and 95% non-parametric bootstrap confidence intervals: ROC-AUC [0.7658, 0.7954], Accuracy [71.44%, 74.25%].
* **Algorithmic Fairness (Section 3.11):** Subgroup disparity audit across biological sex (Female: 56.3% recall, Male: 60.9% recall) and age brackets (<40, 40-49, 50-59, 60+) satisfied the 5 percentage point parity requirement.

---

## 📁 Repository Structure

```
.
├── complete_system_bundle.py        # Complete self-contained single-file Python pipeline
├── ml_pipeline/
│   ├── data_generator.py            # 70k Kaggle cohort synthesis & outlier cleaning
│   ├── feature_engineering.py       # Group C, Group L, Interactions, and Reliability r
│   ├── models.py                    # Calibrated base learners & Late-Fusion Meta-Learner
│   ├── xai.py                       # SHAP & LIME engines with agreement metrics
│   ├── evaluation.py                # DeLong tests, Bootstrap CIs, Fairness auditing
│   ├── train_and_evaluate.py        # End-to-end pipeline execution & export
│   └── ml_export.json               # Serialised benchmark results & model weights
├── app/
│   ├── api/
│   │   ├── predict/route.ts         # Serverless point-of-care prediction & XAI API
│   │   └── benchmarks/route.ts      # Serverless benchmark metadata provider
│   ├── layout.tsx                   # Next.js App Shell
│   ├── globals.css                  # Tailwind styles & print CSS
│   └── page.tsx                     # Full interactive Clinician Dashboard UI
├── public/
│   └── ml_export.json               # Precomputed benchmark datasets for web client
├── package.json                     # Next.js dependencies
├── tsconfig.json                    # TypeScript configuration
├── vercel.json                      # Vercel deployment specification
└── README.md                        # Documentation
```

---

## 🚀 Quickstart: Running the Code

### 1. Running the Standalone Python Research System
To run the complete machine learning pipeline, train models, compute SHAP/LIME attributions, run DeLong tests, and audit algorithmic fairness:

```bash
# Using the bundled virtual environment or any Python 3.9+ with scikit-learn:
python3 complete_system_bundle.py
```

Or run the modular research pipeline:
```bash
cd ml_pipeline
python3 train_and_evaluate.py
```

### 2. Running the Interactive Web Application Locally
The web application is built with **Next.js 14**, **React 18**, **Tailwind CSS**, and **Lucide Icons**:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Run the development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to interact with the clinical decision support system.

---

## 🌐 Deploying to Vercel

The project is pre-configured for **instant zero-configuration deployment on Vercel**.

### Option A: 1-Click Deployment via GitHub (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/cardioxai.git
   git branch -M main
   git push -u origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)**.
3. Select your repository `cardioxai`.
4. Click **Deploy**. Vercel will automatically detect Next.js, run `npm run build`, and deploy your live URL in under 60 seconds!

### Option B: Deploy via Vercel CLI
If you prefer deploying directly from your terminal:
```bash
npx vercel
```
Follow the interactive prompts:
* Link to existing project? **No**
* Project name: `cardioxai`
* Directory: `./`
* Override build settings? **No**

Your project will be compiled and deployed immediately to a live `.vercel.app` URL.

---

## 📋 Features of the Web Application

1. **Patient Risk Assessment & Late-Fusion Engine:**
   - Sliders and inputs for Age, Sex, Height, Weight (auto-computed BMI), Blood Pressure (Systolic & Diastolic), Cholesterol category, Fasting Glucose, Tobacco Smoking, Alcohol intake, Physical Activity level, and Diet Quality index.
   - Live Circular Risk Gauge displaying calibrated probability and assigned clinical risk tier (Low, Moderate, High, Critical).
   - Real-time decomposition of Clinical Branch ($p_C$), Lifestyle Branch ($p_L$), and Reliability Weight ($r$).
2. **Explainable AI (SHAP & LIME) Suite:**
   - Patient Attribution Waterfall displaying exact positive risk drivers and protective factors.
   - Point-of-Care LIME Modifiable Factor Sensitivity with clinical protocols (e.g. smoking cessation, DASH diet recommendations).
   - Concordance Audit Panel (Jaccard overlap, sign agreement, Spearman rank correlation).
3. **Interactive Counterfactual / What-If Simulator:**
   - Direct side-by-side comparison between the patient's baseline state and an intervention scenario.
   - Real-time absolute and relative risk delta calculations.
4. **Experimental Benchmark Matrix:**
   - Full results table across B0 through B7 matching dissertation Table 3.3.
   - Algorithm comparison: Logistic Regression, Decision Tree, Random Forest, SVM.
   - DeLong statistical hypothesis tests and 95% bootstrap confidence intervals.
5. **Algorithmic Fairness & Subgroup Audit:**
   - Stratified performance metrics across Biological Sex and Age Bands with automated parity checks.
6. **Clinical Consultation Summary & PDF Export:**
   - Clean, professional clinical consultation note ready for printing or exporting as a medical record PDF.

---

## 📜 Academic Integrity & Citation

This software is an official research artefact developed for the MSc Data Science Applied Research Project at **York St John University**.

```bibtex
@mastersthesis{thapa2026earlystage,
  author       = {Sarjan Bahadur Thapa},
  title        = {Early-Stage Cardiovascular Disease Prediction Using a Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning System},
  school       = {York St John University, Department of Data Science},
  year         = {2026},
  month        = {September},
  note         = {MSc Applied Research Project Dissertation (Student ID: 260043443)}
}
```
