"""Create the demo login used by the 1-click demo button (development only).

    cd backend && python seed_demo_user.py
"""
from app import models
from app.auth import hash_password
from app.database import Base, SessionLocal, engine

Base.metadata.create_all(bind=engine)
db = SessionLocal()
if not db.query(models.User).filter_by(email="demo@mindcare.ai").first():
    db.add(models.User(full_name="Demo User", email="demo@mindcare.ai", hashed_password=hash_password("ClinicianDemo2026!"),
                       role="patient", age=68, education_years=14, family_history="no"))
    db.commit()
    print("Created demo@mindcare.ai (development only; never seed this in production).")
else:
    print("Demo user already exists.")
