# NeuroGuard

Multi-stage Alzheimer's screening platform (FYP).

## Structure
- `backend/`  FastAPI: auth, game sessions, AD8 questionnaire (aur baad mein risk model, MRI endpoint)
- `frontend/` React (games + dashboard), abhi khali
- `ml/`       Training scripts (MRI baseline, risk model)
- `docs/`     Proposal, literature review

## Backend chalane ka tareeqa
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Phir browser mein kholo: http://127.0.0.1:8000/docs (yahan se saare endpoints test kar sakti ho).

## Pehle hafte ka checklist
- [ ] GitHub repo banao aur ye folder push karo
- [ ] Backend chala kar /docs se register, login, AD8 test karo
- [ ] Kaggle MRI dataset download karo, `ml/mri_baseline.py` Colab par chalao
- [ ] Frontend setup (React + Vite) aur pehli game: card matching
