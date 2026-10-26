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
    # 8 sawalon ke jawab: True = "haan, tabdeeli aayi hai"
    answers: list[bool] = Field(min_length=8, max_length=8)


class Ad8Out(BaseModel):
    id: int
    score: int
    interpretation: str
    created_at: datetime
