# NeuroGuard / MindCare AI

Alzheimer's-risk **screening prototype** (FastAPI + React + scikit-learn). **Not a medical device. The bundled model is trained on synthetic data and is not clinically validated.** See `docs/AUDIT_REPORT.md` and `docs/DATASET_REPORT.md`.

## Run
```bash
# backend (Python 3.12)
cd backend && pip install -r requirements.txt
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
python seed_demo_user.py            # optional dev demo login
python -m uvicorn app.main:app --reload     # http://127.0.0.1:8000/docs
# frontend
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Machine learning
```bash
cd ml
python generate_cognitive_dataset.py                 # SYNTHETIC data + .meta.json
python data_audit.py --csv data/synthetic_cognitive_screening.csv --target risk_level
python train_risk_model.py                           # baselines, CV tuning, one-SE selection, calibration, test, stress test, plots
python -m pytest tests -q                            # leakage / integrity tests
# real data (you must obtain OASIS-2 under its DUA first):
python train_oasis2_model.py --csv /path/to/oasis2_demographics.csv
```
Outputs: `saved_models/*.joblib` (+ SHA-256 manifest verified on load), `reports/risk_model/` (metrics JSON, confusion matrix, ROC, PR, calibration, importance). The dashboard's **Model Performance** page and `GET /ml/model-info` display them.

## MRI module
No trained weights are included, so `/ml/predict-mri` returns HTTP 503. It never fabricates a result. See `ml/mri_predictor.py`.

## Tests
`cd ml && python -m pytest tests -q` (13) and `cd backend && python -m pytest tests -q` (6).
