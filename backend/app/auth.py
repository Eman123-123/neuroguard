import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from . import models

# The signing key must never be a value that is published in the source code.
# Set SECRET_KEY in the environment. If it is absent, a random per-process key is
# used (tokens stop working after a restart) and production mode refuses to start.
import secrets
import warnings

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("NEUROGUARD_ENV", "development").lower() == "production":
        raise RuntimeError("SECRET_KEY must be set when NEUROGUARD_ENV=production")
    warnings.warn("SECRET_KEY not set: using a random ephemeral key (sessions reset on restart).")
    SECRET_KEY = secrets.token_urlsafe(48)
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 12

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise credentials_error
    user = db.get(models.User, user_id)
    if user is None:
        raise credentials_error
    return user
