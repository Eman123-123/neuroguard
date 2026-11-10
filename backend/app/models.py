from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="patient")  # "patient" or "caregiver"
    age = Column(Integer, nullable=True)
    education_years = Column(Integer, nullable=True)
    family_history = Column(String, nullable=True)  # "yes" / "no" / "unknown"
    created_at = Column(DateTime, default=utcnow)

    game_sessions = relationship("GameSession", back_populates="user")
    ad8_responses = relationship("Ad8Response", back_populates="user")


class GameSession(Base):
    """Record of an individual game session. The 'metrics' JSON stores session telemetry,
    e.g., {"moves": 18, "time_sec": 62.4, "errors": 3, "avg_reaction_ms": 540}"""
    __tablename__ = "game_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_type = Column(String, nullable=False)  # card_match, word_recall, sequence, stroop
    metrics = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="game_sessions")


class Ad8Response(Base):
    __tablename__ = "ad8_responses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answers = Column(JSON, nullable=False)  # 8 booleans
    score = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="ad8_responses")
