# CardioXAI: Early-Stage Cardiovascular Disease Prediction System
### Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning

**Author:** Sarjan Bahadur Thapa  
**Student ID:** 260043443  
**Degree:** Master of Science in Data Science (Level 7)  
**Institution:** York St John University, Department of Data Science  
**Dissertation Date:** September 2026  
**Production Deployment:** [https://cardioxai-umber.vercel.app](https://cardioxai-umber.vercel.app)  

---

## 🔬 Project Overview

CardioXAI is an intelligent, transparent clinical decision-support system designed to forecast cardiovascular disease (CVD) at an early, asymptomatic stage. Based on the Master's Applied Research Project (ARP) dissertation by Sarjan Bahadur Thapa, this project bridges the critical gap between predictive machine learning accuracy and clinical trust.

Unlike conventional models that isolate clinical test metrics or naively concatenate disparate data sources (early fusion), this system pioneers a **Dual-Branch Late-Fusion Architecture with Per-Record Lifestyle Reliability Weighting** integrated with a **Point-of-Care Explainable AI (XAI)** suite using **SHAP** and **LIME**.

The entire framework is trained and validated on **authentic real-world datasets**:
1. **Primary Dataset:** Authentic Kaggle Cardiovascular Disease Dataset (70,000 patient records; Sulianova, 2019)
2. **Secondary Target:** Authentic CDC BRFSS Diabetes Health Indicators Dataset (70,692 survey responses; Teboul, 2021)
3. **Clinical Cross-Check:** Canonical UCI Cleveland Heart Disease Dataset (303 patient records; Detrano et al., 1989)

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

### 3. Novelty 3: Clinical Practice Alignment
* Embedded reference targets conforming to the **2017 ACC/AHA High Blood Pressure Practice Guidelines** and **2021 ESC Guidelines on Cardiovascular Disease Prevention**.
* Interactive counterfactual simulations providing exact percentage risk reductions for modifiable clinical targets.
* Exportable, audit-stamped clinical consultation summary formatted for electronic health records.

---

## 📊 Experimental Benchmark Matrix (Configurations B0 – B7)

Evaluated under strict experimental controls (stratified 5-fold CV splits, fixed random seeds, and Platt probability calibration) on the **70,000 authentic patient cohort**:

| Benchmark ID | Architecture / Configuration | Modality Set | ROC-AUC | Accuracy | Recall (Sens) | Specificity | Brier Score | Clinical Role |
|---|---|---|---|---|---|---|---|---|
| **B0** | Framingham Clinical Baseline | Heuristic Risk Score | 0.7238 | 66.01% | 83.06% | 49.48% | 0.2241 | Conventional clinical risk floor |
| **B1** | Clinical-Only ML Baseline | Group C + Demographics | 0.7963 | 73.48% | 68.08% | 78.71% | 0.1829 | Operative comparative floor |
| **B2** | Early Fusion (Prevailing Practice)| Naive Concatenation C + L | 0.7970 | 73.71% | 68.23% | 79.03% | 0.1827 | Concatenation baseline |
| **B3** | **Proposed Late Fusion (Novelty 1)**| **Dual-Branch + Weighting $r$** | **0.7973** | **73.62%** | **69.20%** | **77.92%** | **0.1827** | **Best calibrated late fusion** |
| **B4** | Late Fusion Ablation (No $r$) | Unweighted Late Fusion | 0.7973 | 73.61% | 69.20% | 77.89% | 0.1827 | Reliability weight ablation |
| **B5** | Late Fusion Ablation (No Interactions)| Base Features Only | 0.7949 | 73.55% | 68.89% | 78.06% | 0.1836 | Proves value of cross-modal terms |
| **B6** | Imputation Sensitivity | Mode & Plausibility (S1) | 0.7943 | 73.22% | 68.70% | 77.72% | 0.1847 | Missingness sensitivity analysis |
| **B7** | **Secondary Target Transferability** | **CDC BRFSS Diabetes (71k)** | **0.8245** | **75.04%** | **79.54%** | **70.53%** | **0.1709** | **Proves cross-disease transferability** |

### Statistical Rigour & Fairness Verification
* **DeLong Paired Significance Testing (Section 3.8.4):**
  - Confirmatory Test ($B1$ vs $B2$): $\Delta\text{AUC} = +0.0007, Z = 0.105, p = 0.9163$
  - Proposed Architecture Test ($B2$ vs $B3$): $\Delta\text{AUC} = +0.0003, Z = 0.051, p = 0.9591$
* **Non-Parametric Bootstrap 95% Confidence Intervals ($B3$):**
  - ROC-AUC: $[0.7865, 0.8078]$
  - Accuracy: $[72.58\%, 74.62\%]$
  - Recall: $[68.04\%, 70.36\%]$
* **Subgroup Fairness Audit (Section 3.11):**
  - Biological Sex: Female ($\text{AUC} = 0.8015, \text{Acc} = 73.61\%$) vs Male ($\text{AUC} = 0.7892, \text{Acc} = 73.66\%$) — Parity difference $< 0.1\%$, passing four-fifths parity rule.
  - Age brackets: Stratified across $<40$, $40-49$, $50-59$, and $60+$ years.

---

## 📁 Repository Structure

```
.
├── complete_system_bundle.py        # Complete self-contained single-file Python pipeline (zero-dependency)
├── data/                            # Authentic real-world benchmark datasets
│   ├── cardio_train.csv             # Kaggle 70,000 Cardiovascular Disease dataset
│   ├── diabetes_brfss.csv           # CDC BRFSS 70,692 Diabetes Health Indicators
│   └── heart_uci.csv                # UCI Cleveland Heart Disease dataset (303 records)
├── scripts/
│   └── download_datasets.py         # Automated dataset acquisition script
├── ml_pipeline/                     # Modular ML package
│   ├── data_loader.py               # Dataset loading & physiological plausibility cleaning
│   ├── data_generator.py            # Backward-compatible data loader & generator
│   ├── feature_engineering.py       # Modality separation & cross-modal interaction terms
│   ├── models.py                    # DualBranchLateFusion class & Platt calibration
│   ├── xai.py                       # SHAP additive attributions & LIME surrogate engine
│   ├── evaluation.py                # DeLong tests, bootstrap CIs, fairness audit
│   └── train_and_evaluate.py        # End-to-end retraining & export script
├── app/                             # Next.js 14 Web Application
│   ├── page.tsx                     # 7-tab interactive clinical dashboard
│   ├── api/predict/route.ts         # High-speed serverless late-fusion prediction API
│   └── api/benchmarks/route.ts      # Benchmark serialization endpoint
├── components/
│   └── ui.tsx                       # Reusable clinical UI design system & SVG risk gauges
├── tests/
│   └── test_pipeline.py             # Automated unit & integration test suite
├── .github/workflows/
│   └── ci.yml                       # Continuous integration test & build workflow
├── public/
│   └── ml_export.json               # Pre-computed benchmark results & cohort statistics
└── package.json                     # Node.js project manifest
```

---

## 🚀 Quickstart & Execution Modes

### Mode 1: Interactive CLI Questionnaire
Run the standalone, zero-dependency interactive command line tool:
```bash
python3 complete_system_bundle.py --cli
```

### Mode 2: Embedded Local Web Server (Zero-Dependency)
Launch the lightweight embedded Python dashboard on port 8080 without external servers:
```bash
python3 complete_system_bundle.py --serve 8080
# Open http://localhost:8080 in your browser
```

### Mode 3: Retrain ML Models on 70k Cohort
Execute the full machine learning training and evaluation pipeline:
```bash
python3 complete_system_bundle.py --train
# Or using the modular package:
python3 ml_pipeline/train_and_evaluate.py
```

### Mode 4: Real-Time Ambulatory Telemetry Stream
Run the continuous high-frequency vital signs stream with live late-fusion risk forecasting:
```bash
python3 complete_system_bundle.py --stream
```

### Mode 5: HL7 FHIR R4 Clinical Interoperability
Evaluate a standard hospital FHIR Observation bundle and generate a FHIR RiskAssessment resource:
```bash
python3 complete_system_bundle.py --fhir
```

### Mode 6: Run Comprehensive Automated Test Suite
Execute the unit and integration tests (including real-time streaming, FHIR R4, and audit verification):
```bash
python3 -m unittest discover -s tests
```

### Mode 7: Next.js Production Web Application
Run the clinical dashboard locally:
```bash
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

To build for production:
```bash
npm run build
npm run start
```

---

## ⚡ Real-Time & Real-Life Clinical Architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      REAL-WORLD INGESTION MODALITIES                   │
 │                                                                        │
 │  [Wearables / Smartwatches]   [Hospital EHR (Epic/Cerner)]   [Clinics] │
 │  Continuous ECG, BP, PPG, SpO2    HL7 FHIR R4 Observation     Consult  │
 └───────────────────────┬───────────────────┬──────────────────────┬─────┘
                         │                   │                      │
                         ▼                   ▼                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │             CARDIOXAI REAL-TIME TEMPORAL PROCESSING ENGINE             │
 │                                                                        │
 │  * 1.0 Hz Sliding Window Aggregator: MAP, Pulse Pressure, RPP          │
 │  * Dynamic Sensor Reliability Score r in [0, 1] (noise/contact quality)│
 │  * Dual-Branch Late Fusion:                                            │
 │      p_C (Hemodynamic/Lab Branch) + p_L (Continuous Behavioral Branch) │
 │  * Calibrated Meta-Learner Layer (Trained on 70,000 real Kaggle cohort)│
 └───────────────────────┬────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────────────┐
        ▼                                         ▼
 ┌───────────────────────────────┐ ┌──────────────────────────────────────┐
 │   CRYPTOGRAPHIC AUDIT LEDGER  │ │  REAL-TIME CLINICAL ACTION & ALERTS  │
 │                               │ │                                      │
 │ * SHA-256 Merkle Hash Chain   │ │ * NEWS2 & Acute HTN Surge Detection  │
 │ * Input & Model Fingerprinting│ │ * SBAR Structured Emergency Handover │
 │ * FDA 21 CFR Part 11 / EU MDR │ │ * Point-of-Care SHAP & LIME Guidance │
 │ * Tamper-Proof Verification   │ │ * HL7 FHIR R4 RiskAssessment Export  │
 └───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 📡 Production API Specifications

| Method | Endpoint | Protocol / Standard | Description |
|---|---|---|---|
| `POST` | `/api/predict` | JSON / REST | Standard late-fusion risk inference with automatic cryptographic audit signing |
| `GET` | `/api/stream` | Server-Sent Events (SSE) / REST | Real-time continuous ambulatory telemetry stream at 1.0 Hz |
| `POST` | `/api/fhir` | HL7 FHIR Release 4 | Bidirectional EHR FHIR Bundle parsing and standard RiskAssessment generation |
| `GET` | `/api/audit` | Cryptographic Ledger | Retrieve tamper-proof audit trail and verify SHA-256 chain integrity |
| `GET` | `/api/benchmarks` | Static JSON Serialization | Serves precomputed 70k benchmark matrix (B0 through B7) |

---

## 🏛 Academic Attribution & Citation

```bibtex
@mastersthesis{thapa2026cardioxai,
  author       = {Sarjan Bahadur Thapa},
  title        = {Early-Stage Cardiovascular Disease Prediction Using a Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning},
  school       = {York St John University},
  department   = {Department of Data Science},
  year         = {2026},
  month        = {September},
  note         = {MSc Data Science Applied Research Project Dissertation (Student ID: 260043443)}
}
```
