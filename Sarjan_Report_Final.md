---
title: "Early-Stage Disease Prediction Using Integrated Lifestyle and Clinical Data with Explainable Machine Learning Models"
author: "Sarjan Bahadur Thapa"
student_id: "260043443"
date: "14th May 2026"
---

# Cover Page

**Title:** Early-Stage Disease Prediction Using Integrated Lifestyle and Clinical Data with Explainable Machine Learning Models

**Student Name:** Sarjan Bahadur Thapa  
**Student Number:** 260043443  
**Assessment Type:** Proposal presentation (adapted to Report)  
**Date of Submission:** 14th May 2026  

---

# Declaration

The candidate confirms that the work submitted is his own and that appropriate credit has been given where reference has been made to the work of others.

This copy has been supplied on the understanding that it is copyright material. Any reuse must comply with the Copyright, Designs and Patents Act 1988 and any licence under which this copy is released.

© 2026 Sarjan Bahadur Thapa

The right of Sarjan Bahadur Thapa to be identified as Author of this work has been asserted by him in accordance with the Copyright, Designs and Patents Act 1988.

---

# Self-declaration on Academic Integrity

- I have read and understood the Academic Misconduct statement. **[x] Tick to confirm**
- I have read and understood the Generative Artificial Intelligence use statement. **[x] Tick to confirm**
- I am satisfied that I have met the Learning Outcomes of this assignment. **[x] Met**

---

# Abstract

Timely detection of diseases plays a critical role in enhancing patient survival rates and lowering healthcare costs. However, traditional diagnostic approaches are often slow and heavily reliant on manual assessment. This study presents a hybrid machine learning system designed to predict diseases at an early stage by integrating both clinical data (e.g., blood pressure, cholesterol, glucose, BMI) and lifestyle data (e.g., smoking, exercise, diet). Several machine learning models, including Logistic Regression, Decision Trees, Random Forests, and Support Vector Machines (SVM), are compared to identify the most accurate predictive engine. To ensure clinical trustworthiness and transparency, Explainable AI (XAI) techniques such as SHAP and LIME are incorporated into the system. The proposed solution acts as an intelligent decision-support tool, enabling healthcare professionals to make quicker, evidence-based, and highly accurate clinical decisions, ultimately improving patient outcomes.

---

# Acknowledgment

I convey my sincerest appreciation to my academic supervisors and mentors for their essential guidance and useful feedback that supported my research over its entire duration. Their professional advisory combined with motivational support has been fundamental for developing this study.

I also express gratitude to the healthcare professionals and data scientists who provided vital insights regarding predictive modeling and Explainable AI. The intellectual guidance provided by these professionals improved my concepts and expanded my knowledge base for this research subject.

---

# Table of Contents

1. [CHAPTER 1: INTRODUCTION](#chapter-1-introduction)
   1.1 [Background and Motivation](#11-background-and-motivation)
   1.2 [Problem Statement](#12-problem-statement)
   1.3 [Research Questions](#13-research-questions)
   1.4 [Research Objectives](#14-research-objectives)
   1.5 [Research Aims](#15-research-aims)
   1.6 [Scope and Limitations](#16-scope-and-limitations)
   1.7 [Thesis Structure](#17-thesis-structure)
2. [CHAPTER 2: LITERATURE REVIEW](#chapter-2-literature-review)
   2.1 [Introduction](#21-introduction)
   2.2 [The Role of Machine Learning in Healthcare](#22-the-role-of-machine-learning-in-healthcare)
   2.3 [Challenges in Traditional Disease Diagnosis](#23-challenges-in-traditional-disease-diagnosis)
   2.4 [Artificial Intelligence and Predictive Analytics in Medicine](#24-artificial-intelligence-and-predictive-analytics-in-medicine)
   2.5 [The Importance of Integrated Data (Clinical and Lifestyle)](#25-the-importance-of-integrated-data-clinical-and-lifestyle)
   2.6 [Explainable AI (XAI) for Clinical Trust](#26-explainable-ai-xai-for-clinical-trust)
   2.7 [Ethical Considerations in AI Healthcare](#27-ethical-considerations-in-ai-healthcare)
   2.8 [Research Gap Identification](#28-research-gap-identification)

---

# List of Abbreviations

| Abbreviation | Full Form |
|---|---|
| AI | Artificial Intelligence |
| ML | Machine Learning |
| XAI | Explainable Artificial Intelligence |
| SHAP | SHapley Additive exPlanations |
| LIME | Local Interpretable Model-agnostic Explanations |
| SVM | Support Vector Machine |
| ROC-AUC | Receiver Operating Characteristic - Area Under Curve |
| BMI | Body Mass Index |
| EHR | Electronic Health Record |
| GDPR | General Data Protection Regulation |

---

# CHAPTER 1: INTRODUCTION

## 1.1 Background and Motivation
Timely detection of health anomalies plays an important role in enhancing the length of patient survival and significantly lowering healthcare costs. In the modern medical landscape, early diagnosis acts as the primary defense against chronic and life-threatening conditions. However, the traditional diagnostic approach is often time-consuming, requiring extensive manual evaluation. By leveraging vast amounts of patient information, Machine Learning (ML) can help healthcare systems accurately and rapidly forecast illnesses before critical symptoms emerge. 

This project is motivated by the potential of integrating lifestyle data (such as smoking, exercise, and diet) with clinical data (such as blood pressure, cholesterol levels, and BMI) for early-stage disease prediction. Furthermore, the integration of new techniques in Explainable AI (XAI), such as SHAP and LIME, is essential to enhance transparency and build trust in algorithmic predictions among healthcare practitioners. The ultimate purpose of this research is to create an intelligent, data-driven decision-making system for doctors.

## 1.2 Problem Statement
Many diseases are identified only when they have progressed to advanced stages, making them difficult to treat and drastically lowering patient survival rates. The traditional diagnosis methods rely heavily on manual assessment and clinical experience, making the process highly dependent and inherently slow. 

While a substantial amount of patient data—encompassing both clinical metrics and lifestyle choices—is collected daily, it is rarely utilized to its full extent for early prediction. Currently, most predictive models in healthcare are limited strictly to clinical data and neglect crucial lifestyle factors. Furthermore, many existing AI healthcare systems operate as "black boxes" lacking explainability; as a result, doctors find it hard to trust and apply these models in real-world scenarios. Thus, an accurate, transparent, and explainable machine learning system capable of integrating diverse data sources for early disease prediction is urgently needed.

## 1.3 Research Questions
- **Q1:** What are the primary limitations and delays associated with current traditional diagnostic approaches for early disease prediction?
- **Q2:** To what extent can the integration of lifestyle data with clinical data improve the predictive accuracy of machine learning models?
- **Q3:** How do different machine learning algorithms (Logistic Regression, Decision Tree, Random Forest, SVM) compare when predicting early-stage diseases using a hybrid dataset?
- **Q4:** In what ways can Explainable AI (XAI) techniques, specifically SHAP and LIME, enhance the clinical trustworthiness and transparency of these predictive models?

## 1.4 Research Objectives
1. To collect and preprocess a comprehensive dataset integrating both clinical attributes and lifestyle factors from sources like Kaggle and the UCI Machine Learning Repository.
2. To develop, train, and test multiple machine learning algorithms (Logistic Regression, Decision Tree, Random Forest, and SVM) for early-stage disease prediction.
3. To evaluate the performance of these models using rigorous metrics including Accuracy, Precision, Recall, F1-score, and ROC-AUC.
4. To implement Explainable AI (XAI) techniques to interpret model predictions, thereby understanding feature importance and delivering transparent results for healthcare decision-making.

## 1.5 Research Aims
1. **Develop an Intelligent Hybrid System:** To build a functional and highly accurate machine learning system that uses both clinical and lifestyle data to predict early-stage diseases.
2. **Promote Clinical Trust through Transparency:** To integrate XAI tools (SHAP and LIME) to ensure that the AI's decision-making process is fully interpretable by medical professionals.
3. **Enhance Medical Workflows:** To provide doctors with an intelligent decision-support tool that aids in quicker, evidence-based diagnoses, ultimately improving patient survival rates and lowering healthcare expenses.

## 1.6 Scope and Limitations
This study focuses specifically on early-stage disease prediction using structured clinical data (blood pressure, cholesterol, glucose level, BMI) and lifestyle data (smoking habits, exercise frequency, diet quality). The research relies on publicly available datasets from Kaggle and the UCI Machine Learning Repository.

The scope does not currently include real-time integration with wearable technology or live Electronic Health Records (EHRs), though these are recommended for future work. Additionally, the developed system is strictly intended to serve as a medical decision-support tool and is not designed to replace professional clinical judgment or direct medical practice.

## 1.7 Thesis Structure
- **Chapter 1: Introduction** – Outlines the background, problem statement, research questions, and aims of the study.
- **Chapter 2: Literature Review** – Analyzes existing literature on AI in healthcare, the role of integrated datasets, and Explainable AI.
- **Chapter 3: Methodology** – Details the data collection, preprocessing, feature selection, and model development phases (Future Phase).
- **Chapter 4: Results and Analysis** – Presents the performance evaluation of the ML models and the outputs from XAI tools (Future Phase).
- **Chapter 5: Discussion** – Interprets the findings in the context of the healthcare industry and the research objectives (Future Phase).
- **Chapter 6: Conclusion and Future Work** – Summarizes the project outcomes and suggests future technological expansions (Future Phase).

---

# CHAPTER 2: LITERATURE REVIEW

## 2.1 Introduction
The application of artificial intelligence in healthcare represents a significant technological leap, transitioning clinical environments from reactive treatments to proactive interventions. This literature review evaluates the current state of machine learning applications in disease prediction, focusing specifically on the challenges of traditional diagnostics and the limitations of models that ignore patient lifestyle data. Furthermore, it explores the critical role of Explainable Artificial Intelligence (XAI) in bridging the gap between algorithmic accuracy and clinical trust, establishing the foundation for the proposed hybrid prediction system.

## 2.2 The Role of Machine Learning in Healthcare
Historically, clinical diagnosis has relied entirely on the cognitive abilities, experience, and deductive reasoning of medical professionals. While effective, this manual approach struggles with the sheer volume and complexity of modern medical data. Machine Learning (ML) introduces the capability to process massive datasets, identifying subtle patterns and correlations that precede clinical symptoms (Bishop, 2006). ML has demonstrated exceptional performance in patient risk stratification, anomaly detection, and prognostic forecasting, shifting the medical paradigm toward precision medicine (Kuhn & Johnson, 2013).

## 2.3 Challenges in Traditional Disease Diagnosis

### 2.3.1 Late Detection and Survival Rates
A major barrier in contemporary healthcare is the late detection of severe conditions, such as cardiovascular diseases. The World Health Organization (2023) notes that late-stage diagnosis drastically reduces patient survival rates and limits therapeutic options. Traditional diagnostic workflows often result in delays, costing crucial intervention time.

### 2.3.2 Over-reliance on Manual Assessment
Manual assessment is inherently subjective and prone to human error, cognitive fatigue, and variations in physician expertise. Traditional methods are slow and often fail to synthesize multivariate data effectively, leading to missed early warning signs.

### 2.3.3 Underutilization of Lifestyle Data
While clinical metrics (e.g., blood pressure, glucose) are standard diagnostic tools, lifestyle behaviors (e.g., smoking, dietary habits, exercise) are equally critical determinants of chronic diseases. Unfortunately, traditional diagnostic models and early predictive algorithms frequently isolate clinical data, failing to capitalize on the predictive power of a patient’s lifestyle history.

## 2.4 Artificial Intelligence and Predictive Analytics in Medicine
Advanced ML models have been increasingly adopted to address diagnostic delays. 

### 2.4.1 Logistic Regression and SVM in Clinical Predictions
Logistic Regression remains a foundational statistical tool for binary classification in medicine due to its interpretability and efficiency. Support Vector Machines (SVM) offer robust performance in high-dimensional spaces, making them highly effective for classifying complex clinical datasets (James et al., 2021). 

### 2.4.2 Decision Trees and Random Forests
Tree-based algorithms, such as Decision Trees and Random Forests, mimic human decision-making processes. Random Forests, which utilize ensemble learning, are particularly noted for their high accuracy and resilience against overfitting when dealing with heterogeneous healthcare data (Géron, 2022). 

## 2.5 The Importance of Integrated Data (Clinical and Lifestyle)
The human body's health is a product of both biological metrics and environmental/lifestyle choices. Research indicates that combining clinical data (e.g., BMI, cholesterol) with lifestyle factors provides a holistic view of a patient’s health trajectory. Hybrid datasets yield models with superior predictive accuracy, as lifestyle habits often serve as leading indicators for clinical abnormalities.

## 2.6 Explainable AI (XAI) for Clinical Trust

### 2.6.1 The Need for Transparency
A significant hurdle in the adoption of AI in healthcare is the "black-box" nature of advanced algorithms. Medical professionals require transparency to trust an AI's diagnosis, as they are ultimately responsible for patient care. Explainable AI addresses this by revealing how specific inputs influence the model's output (Molnar, 2022).

### 2.6.2 SHAP (SHapley Additive exPlanations)
SHAP uses game theory to assign an importance value to every feature in a specific prediction. By quantifying exactly how much elements like "smoking history" or "blood pressure" contributed to a disease prediction, SHAP allows doctors to understand the reasoning behind the algorithm's output.

### 2.6.3 LIME (Local Interpretable Model-agnostic Explanations)
LIME creates local, simplified models around individual predictions to explain the behavior of complex global models. This local interpretability ensures that physicians can validate individual patient risk assessments against their medical knowledge.

## 2.7 Ethical Considerations in AI Healthcare

### 2.7.1 Patient Data Privacy and GDPR
The processing of clinical and lifestyle data must strictly adhere to data protection regulations such as GDPR. Patient data must be anonymized to ensure secure data storage and prevent the misuse of sensitive health-related information.

### 2.7.2 Bias and Fairness
Machine learning models are susceptible to inheriting biases present in their training data. Ensuring fairness requires rigorous testing to guarantee that the system does not produce discriminatory predictions across different demographic groups.

## 2.8 Research Gap Identification
Current healthcare prediction models frequently exhibit distinct limitations that this project aims to resolve.

| Feature | Existing Healthcare ML Models | Proposed Hybrid XAI System |
|---|---|---|
| **Data Scope** | Primarily focused on clinical test results. | Integrates both clinical and lifestyle data. |
| **Model Interpretability** | Often act as "black boxes" with low transparency. | Integrates SHAP and LIME for fully explainable predictions. |
| **Early Detection Focus** | Often trained on late-stage symptomatic data. | Specifically designed to identify early-stage risk factors. |
| **Clinical Usability** | Difficult for doctors to trust without clear reasoning. | Designed as a transparent decision-support tool. |

*Table 2: Research Gap Identification*

The proposed system addresses these gaps by creating a hybrid, interpretable, and highly accurate tool designed explicitly to support and accelerate early-stage clinical decision-making.
