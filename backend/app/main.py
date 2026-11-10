from datetime import datetime
from pathlib import Path
import sys
from typing import Any
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Add project root to sys.path so ml module can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
ML_DIR = PROJECT_ROOT / "ml"
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

# The ml/ folder is a plain module directory (it is put on sys.path above).
from risk_predictor import (  # noqa: E402
    DEFAULT_REPORT_PATH, InsufficientDataError, InvalidInputError, get_model_report, get_risk_predictor,
)
from mri_predictor import ModelUnavailableError, get_mri_predictor  # noqa: E402

from . import models, schemas
from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NeuroGuard API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DISCLAIMER = "This is an investigational screening tool and not a definitive medical diagnosis. Low risk does not definitively exclude neurodegenerative conditions."


@app.get("/")
def root():
    return {"app": "NeuroGuard", "status": "ok", "disclaimer": DISCLAIMER}


# ---------- Auth ----------
@app.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        age=data.age,
        education_years=data.education_years,
        family_history=data.family_history,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # The OAuth2 standard uses the 'username' field, which maps to the user's email address
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return schemas.Token(access_token=create_access_token(user.id))


@app.get("/auth/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


# ---------- Games ----------
@app.post("/games/sessions", response_model=schemas.GameSessionOut, status_code=201)
def save_game_session(
    data: schemas.GameSessionCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = models.GameSession(user_id=user.id, game_type=data.game_type, metrics=data.metrics)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@app.get("/games/sessions", response_model=list[schemas.GameSessionOut])
def list_game_sessions(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(models.GameSession)
        .filter(models.GameSession.user_id == user.id)
        .order_by(models.GameSession.created_at.desc())
        .all()
    )


# ---------- AD8 questionnaire ----------
AD8_QUESTIONS = [
    "Problems with judgment (e.g., poor financial decisions, falling for scams)",
    "Reduced interest in hobbies or routine activities",
    "Repeating the same questions, stories, or statements over and over",
    "Trouble learning how to use a tool, appliance, or gadget",
    "Forgetting the correct month or year",
    "Difficulty managing complicated financial affairs (bills, taxes, checkbook)",
    "Trouble remembering scheduled appointments or events",
    "Daily, persistent problems with memory and thinking",
]


@app.get("/ad8/questions")
def ad8_questions():
    return {"questions": AD8_QUESTIONS}


@app.post("/ad8", response_model=schemas.Ad8Out, status_code=201)
def submit_ad8(
    data: schemas.Ad8Submit,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    score = sum(data.answers)
    record = models.Ad8Response(user_id=user.id, answers=data.answers, score=score)
    db.add(record)
    db.commit()
    db.refresh(record)
    # On the AD8, a score of 2 or more indicates potential cognitive impairment
    interpretation = (
        "Score of 2 or greater: Cognitive impairment suggested; clinical medical consultation recommended."
        if score >= 2
        else "Score of 0–1: Within normal informant baseline; continue routine periodic health monitoring."
    )
    return schemas.Ad8Out(
        id=record.id,
        score=score,
        interpretation=interpretation + " " + DISCLAIMER,
        created_at=record.created_at,
    )


# ---------- ML Risk Assessment ----------
def _run_risk_model(**inputs):
    """Run the real trained model; translate ML errors into proper HTTP codes."""
    try:
        return get_risk_predictor().predict(**inputs)
    except (InvalidInputError, InsufficientDataError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=f"Risk model unavailable: {e}")


@app.get("/ml/model-info")
def model_info():
    """Model card: provenance, validation status, full evaluation metrics and plot URLs."""
    report = get_model_report()
    if report is None:
        raise HTTPException(status_code=503, detail="No model report found. Run ml/train_risk_model.py.")
    return {**report, "plot_urls": {k: f"/ml/model-report/{v}" for k, v in report["plots"].items()}}


_REPORT_PLOTS = {"confusion_matrix.png", "roc_curve.png", "pr_curve.png", "calibration.png", "feature_importance.png"}


@app.get("/ml/model-report/{filename}")
def model_report_plot(filename: str):
    if filename not in _REPORT_PLOTS:  # whitelist: no path traversal
        raise HTTPException(status_code=404, detail="Unknown plot")
    path = Path(DEFAULT_REPORT_PATH).parent / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Plot not generated yet")
    return FileResponse(path, media_type="image/png")


@app.post("/ml/predict-risk", response_model=schemas.RiskAssessmentOut)
def predict_cognitive_risk(
    req: schemas.RiskAssessmentRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Predict Alzheimer's / MCI risk score from clinical demographics, AD8, and game telemetry."""
    age = req.age if req.age is not None else (user.age if req.use_profile_data else None)
    edu = req.education_years if req.education_years is not None else (user.education_years if req.use_profile_data else None)
    fam = req.family_history if req.family_history is not None else (user.family_history if req.use_profile_data else None)

    ad8 = req.ad8_score
    if ad8 is None and req.use_profile_data:
        latest_ad8 = (
            db.query(models.Ad8Response)
            .filter(models.Ad8Response.user_id == user.id)
            .order_by(models.Ad8Response.created_at.desc())
            .first()
        )
        if latest_ad8:
            ad8 = latest_ad8.score

    card_match = req.card_match_metrics
    stroop = req.stroop_metrics
    sequence = req.sequence_metrics

    # Auto-fetch telemetry from past database sessions if not explicitly passed
    if req.use_profile_data:
        if card_match is None:
            latest_card = (
                db.query(models.GameSession)
                .filter(models.GameSession.user_id == user.id, models.GameSession.game_type == "card_match")
                .order_by(models.GameSession.created_at.desc())
                .first()
            )
            if latest_card:
                card_match = latest_card.metrics

        if stroop is None:
            latest_stroop = (
                db.query(models.GameSession)
                .filter(models.GameSession.user_id == user.id, models.GameSession.game_type == "stroop")
                .order_by(models.GameSession.created_at.desc())
                .first()
            )
            if latest_stroop:
                stroop = latest_stroop.metrics

        if sequence is None:
            latest_seq = (
                db.query(models.GameSession)
                .filter(models.GameSession.user_id == user.id, models.GameSession.game_type == "sequence")
                .order_by(models.GameSession.created_at.desc())
                .first()
            )
            if latest_seq:
                sequence = latest_seq.metrics

    return schemas.RiskAssessmentOut(**_run_risk_model(
        age=age, education_years=edu, family_history=fam, ad8_score=ad8,
        card_match_metrics=card_match, stroop_metrics=stroop, sequence_metrics=sequence,
    ))


@app.post("/ml/predict-risk/quick", response_model=schemas.RiskAssessmentOut)
def predict_cognitive_risk_quick(req: schemas.RiskAssessmentRequest):
    """Anonymous/Quick screening without requiring user login."""
    return schemas.RiskAssessmentOut(**_run_risk_model(
        age=req.age, education_years=req.education_years, family_history=req.family_history,
        ad8_score=req.ad8_score, card_match_metrics=req.card_match_metrics,
        stroop_metrics=req.stroop_metrics, sequence_metrics=req.sequence_metrics,
    ))


# ---------- PDF Clinical Report Generation ----------
@app.post("/reports/download-pdf")
def download_clinical_report_endpoint(report_data: dict[str, Any]):
    """Generate and return a downloadable medical PDF report."""
    try:
        from .pdf_generator import generate_clinical_report_pdf
    except ImportError:
        from pdf_generator import generate_clinical_report_pdf

    try:
        pdf_buffer = generate_clinical_report_pdf(report_data)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"neuroguard_clinical_report_{timestamp}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


# ---------- MRI Neuroimaging Classifier ----------
SCANS_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "sample_scans"


@app.get("/ml/mri-status")
def mri_status():
    return get_mri_predictor().status()


@app.get("/ml/sample-scans")
def list_sample_mri_scans():
    """Benchmark images are SYNTHETIC drawings generated by ml/generate_sample_scans.py, not real MRI."""
    sample_info = [
        {"id": "non_demented_normal.jpg", "label": "Synthetic illustration: preserved anatomy", "stage": "Illustration only"},
        {"id": "very_mild_mci.jpg", "label": "Synthetic illustration: borderline", "stage": "Illustration only"},
        {"id": "mild_alzheimers.jpg", "label": "Synthetic illustration: moderate atrophy", "stage": "Illustration only"},
        {"id": "moderate_alzheimers.jpg", "label": "Synthetic illustration: severe atrophy", "stage": "Illustration only"},
    ]
    return {"samples": sample_info, "synthetic": True}


@app.get("/ml/sample-scans/{filename}")
def get_sample_mri_file(filename: str):
    """Serve a synthetic sample image."""
    safe_name = Path(filename).name
    file_path = SCANS_DIR / safe_name
    if not file_path.exists() or file_path.suffix.lower() != ".jpg":
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(file_path, media_type="image/jpeg")


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}


def _predict_mri(image):
    try:
        return schemas.MriPredictionOut(**get_mri_predictor().predict_image(image))
    except ModelUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # corrupt image etc.
        raise HTTPException(status_code=400, detail=f"Could not analyse image: {type(e).__name__}")


@app.post("/ml/predict-mri", response_model=schemas.MriPredictionOut)
async def predict_mri_scan(file: UploadFile = File(...)):
    """Analyse an uploaded brain MRI image. Returns 503 unless a trained MRI model is installed."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG or PNG images are accepted.")
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")
    return _predict_mri(contents)


@app.post("/ml/predict-mri/sample/{sample_name}", response_model=schemas.MriPredictionOut)
def predict_mri_sample(sample_name: str):
    """Run the MRI model on a synthetic sample image (503 unless a trained model is installed)."""
    file_path = SCANS_DIR / Path(sample_name).name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Sample image not found")
    return _predict_mri(str(file_path))
