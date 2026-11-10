from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["patient", "caregiver"] = "patient"
    age: Optional[int] = Field(default=None, ge=1, le=120)
    education_years: Optional[int] = Field(default=None, ge=0, le=40)
    family_history: Optional[Literal["yes", "no", "unknown"]] = None


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    age: Optional[int]
    education_years: Optional[int]
    family_history: Optional[str]

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GameSessionCreate(BaseModel):
    game_type: Literal["card_match", "word_recall", "sequence", "stroop"]
    metrics: dict[str, Any]


class GameSessionOut(BaseModel):
    id: int
    game_type: str
    metrics: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class Ad8Submit(BaseModel):
    # 8 question responses: True indicates a consistent change observed over time
    answers: list[bool] = Field(min_length=8, max_length=8)


class Ad8Out(BaseModel):
    id: int
    score: int
    interpretation: str
    created_at: datetime


class RiskAssessmentRequest(BaseModel):
    age: Optional[int] = None
    education_years: Optional[int] = None
    family_history: Optional[Literal["yes", "no", "unknown"]] = None
    ad8_score: Optional[int] = Field(default=None, ge=0, le=8)
    card_match_metrics: Optional[dict[str, Any]] = None
    stroop_metrics: Optional[dict[str, Any]] = None
    sequence_metrics: Optional[dict[str, Any]] = None
    use_profile_data: bool = True  # If true, auto-fill missing fields from user profile and recent DB records


class RiskAssessmentOut(BaseModel):
    risk_level: str
    risk_level_code: int
    risk_score: float
    confidence: float
    class_probabilities: dict[str, float]
    clinical_flags: list[str]
    recommendation: str
    stage_advice: str
    features_evaluated: dict[str, Any]
    disclaimer: str
    # Transparency fields (optional so older clients keep working)
    imputed_features: list[str] = []
    data_completeness: Optional[float] = None
    reliability: Optional[str] = None
    model_info: Optional[dict[str, Any]] = None


class MriPredictionOut(BaseModel):
    predicted_class: str
    class_code: int
    severity_code: str
    confidence: float
    class_probabilities: dict[str, float]
    ventricle_to_brain_ratio: Optional[str] = None
    biomarkers_detected: list[str] = []
    clinical_recommendation: str
    heatmap_image: str
    disclaimer: str


