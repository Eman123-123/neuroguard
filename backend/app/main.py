from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NeuroGuard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DISCLAIMER = "Ye diagnosis nahi hai, screening tool hai. Low risk ka matlab ye nahi ke bimari nahi."


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
    # OAuth2 form mein "username" field hota hai, hum usmein email lete hain
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
    "Judgement mein masle (jaise ghalat maali/paise ke faislay)",
    "Shauq ya activities mein dilchaspi kam hona",
    "Wahi sawal, kahani ya baat baar baar dohrana",
    "Tools, gadgets ya appliances istemal karna seekhne mein mushkil",
    "Sahi mahina ya saal bhool jana",
    "Complicated maali (financial) maamlaat sambhalne mein mushkil",
    "Appointments yaad rakhne mein mushkil",
    "Rozana soch aur yaaddasht mein musalsal masle",
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
    # AD8 mein 2 ya zyada "haan" cognitive impairment ka shak dikhate hain
    interpretation = (
        "Score 2 ya us se zyada hai: cognitive tabdeeli ka imkaan hai, doctor se mashwara karein."
        if score >= 2
        else "Score 0-1: abhi koi wazeh nishani nahi, lekin regular re-test karte rahein."
    )
    return schemas.Ad8Out(
        id=record.id,
        score=score,
        interpretation=interpretation + " " + DISCLAIMER,
        created_at=record.created_at,
    )
