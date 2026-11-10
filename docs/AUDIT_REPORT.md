# NeuroGuard / MindCare AI: Technical Audit (Phase 1)

Audit date: 9 Nov 2026. Scope: every file in `WebMlProject.zip`. Method: source reading, executing the shipped code, and measuring the shipped model/dataset. Statuses: **FIXED** (changed in this delivery), **MITIGATED**, **OPEN** (documented, not changed).

## 1. Existing features
Auth (register/login/JWT), AD8 questionnaire, Card-Match and Stroop games with telemetry, a tabular 3-class risk model behind `/ml/predict-risk[/quick]`, an MRI module, ReportLab PDF reports, and a React dashboard (wizard, history, trends, benchmarks, knowledge centre, tips, notifications).

## 2. Headline findings (ordered by severity)

| # | Finding | Evidence | Status |
|---|---|---|---|
| C1 | **Login bypass.** `loginUser` caught every error, including wrong passwords, and signed the user in as a fake "Dr. Evelyn Reed" with a hard-coded token. `registerUser` did the same. | `frontend/src/services/api.js` (original) | FIXED |
| C2 | **MRI output was fabricated.** `resnet50_baseline.pt` does not exist, so a hand-written pixel-threshold rule returned hard-coded probabilities (0.88/0.78/...) and clinical text ("hippocampal atrophy") for any image. Tested: random noise, solid black, solid white and a gradient were all labelled *Non-Demented, 88% confidence*. The "Grad-CAM" was fixed Gaussians at the same location on every image. | executed `mri_predictor.py` | FIXED: returns HTTP 503 unless real weights exist; real Grad-CAM implemented (untested: needs torch + weights) |
| C3 | **Risk model trained on synthetic data presented as clinical.** Labels were assigned first, then features drawn from author-chosen Gaussians. Reported 95.5% accuracy equals the ceiling implied by the generator's 4% label noise: the model rediscovered the generator. | `generate_cognitive_dataset.py`; single features reach one-vs-rest AUC 0.95 | MITIGATED: data labelled synthetic, status stamped on artifact/API/UI. Cannot be fixed without real data (see DATASET_REPORT.md) |
| C4 | **Frontend fabricated results when the backend was unreachable**: client-side rule engine returned "92% confidence", "88.5 risk score", and a simulated MRI result. | `fallbackClinicalRiskEstimation`, `fallbackMriPrediction` | FIXED: removed; UI shows an error |
| C5 | **Silent healthy defaults.** Skipped AD8/games were replaced by normal-looking values (AD8=1, 18 moves, 685 ms ...). A hard-coded `sequence_max_span: 6` was sent on every request although **no sequence game exists**, so 1 of 10 model inputs was invented on every call. | `DashboardLayout.jsx`, `RiskDashboard.jsx`, `risk_predictor.IMPUTATION_DEFAULTS` | FIXED: nulls sent; model imputes with training medians and reports `imputed_features`; <6/10 inputs is rejected (HTTP 422) |
| H1 | **Unsourced performance claims** on the landing page: "94.8% Detection Sensitivity", "92.3% Executive Correlation", "91.6% Clinical Concordance" correspond to no experiment. "95.5% Macro F1" was the synthetic figure. Landing "sandbox" was a hand-written formula described as the "trained gradient-boosted engine" with an invented 88-98% "confidence". ResNet-18 / ResNet-50 inconsistently named. | `LandingPage.jsx` | FIXED |
| H2 | **Fabricated history and reports.** `getStoredAssessments` seeded two invented patients; `saveAssessmentToHistory` filled missing values with `15.0`, `0.92`, `"2.1%"`; report/PDF handlers hard-coded class probabilities, `time_sec: 42`, and a "Screening record verified" flag. History lives only in browser `localStorage` (not per account). Trend/benchmark charts use invented monthly data and "simulated from OASIS/ADNI" population numbers. | `api.js`, `DashboardLayout.jsx`, `CognitiveTrends.jsx`, `PatientComparison.jsx` | FIXED for history/reports/PDF; **OPEN** for Trends and Benchmarks (still simulated: remove or replace with real stored data) |
| H3 | `requirements.txt` omitted scikit-learn, pandas, numpy, xgboost, joblib, ReportLab, Pillow: a clean install could not load the model or build PDFs. Pickled models also break across sklearn versions. | file | FIXED: pinned; version-mismatch warning |
| H4 | JWT signing key defaulted to the public string `dev-only-change-me` (tokens forgeable). | `auth.py` | FIXED: env var or random ephemeral key; production refuses to start without one |
| H5 | `joblib.load` of an unverified file (arbitrary code execution if swapped). | `risk_predictor.py` | FIXED: SHA-256 manifest verified before load |
| M1 | MRI upload had no size/type limit. | `main.py` | FIXED (10 MB, JPEG/PNG, 415/413/400) |
| M2 | `/reports/download-pdf` is unauthenticated and renders arbitrary client-supplied JSON. `/ml/predict-risk/quick` and MRI are unauthenticated with no rate limiting. | `main.py` | OPEN |
| M3 | Wrong `ML_DIR` path (`neuroguard/neuroguard/ml`) hid behind an import fallback. | `main.py` | FIXED |
| M4 | `family_history` encoded ordinally with "unknown" between "no" and "yes" (invented ordering). | `train_risk_model.py` | FIXED: one-hot |
| M5 | Model chosen by a single test-set comparison with no tuning, no calibration, no baselines; "risk score" weights (5/50/95) were arbitrary and presented as a clinical score. | `train_risk_model.py`, `risk_predictor.py` | FIXED / relabelled "ordinal index" |
| M6 | `mri_baseline.py`: 3 epochs, no validation split, slice-level split risk. | file | DOCUMENTED (header warning) |
| M7 | Two committed empty `neuroguard.db` files, committed `frontend/dist`, MRI "samples" are synthetic drawings labelled as benchmark clinical scans. | repo | FIXED / relabelled |
| L1 | Two pre-existing React-hooks lint errors (`DashboardLayout.jsx:55`, `MRIAnalysis.jsx:31`). Tests directory imported a non-existent package path. | eslint, pytest | OPEN (lint) / FIXED (tests) |
| L2 | Clinical flags used arbitrary thresholds presented as clinical indicators. | `risk_predictor.py` | FIXED: renamed "descriptive observations", AD8 cut-off only |

## 3. ML model limitations (after this work)
* No clinical validity: no dataset with this app's features and real labels exists publicly. Metrics measure pipeline correctness only.
* The Card-Match and Stroop implementations are not validated instruments; their thresholds and feature distributions are assumptions.
* Probabilities are calibrated against the synthetic distribution only; real-world calibration is unknown.
* A stress test (class separation 0.6, new seed) drops the model from 96.1% to 78.4% accuracy: sensitivity to distribution shift.

## 4. Dataset problems
See `DATASET_REPORT.md`.

## 5. UI/UX problems
Fake states presented as real (C1, C4, H1, H2); estimated-value tiles ("18 moves (est)"); 1,484-line `DashboardLayout.jsx` mixes wizard, history, report and profile logic (maintainability); no consent/privacy notice before collecting health data; no accessibility pass (not audited in depth).

## 6. Security (summary)
Fixed: C1, H4, H5, M1. Open: M2, CORS locked to localhost dev origins (fine for dev; configure for deploy), SQLite for development, no password-reset, no rate limiting, tokens in `localStorage` (XSS exposure), no audit log, no consent or data-retention policy. Health data collected from real users would need GDPR/HIPAA-style review before any deployment.

## 7. Recommended next steps
1. Apply for OASIS (and ADNI) access today; run `train_oasis2_model.py` (see DATASET_REPORT.md).
2. Collect real, consented Card-Match/Stroop/AD8 data alongside clinician-assigned diagnoses (ethics approval needed) and retrain; until then keep the synthetic banner.
3. Replace or remove the simulated Trends/Benchmarks views; persist assessments server-side per user.
4. Train the MRI model on subject-split OASIS/ADNI with external validation, or remove the module from the defence demo.
5. Authenticate and rate-limit the PDF/prediction endpoints; split `DashboardLayout.jsx`.
