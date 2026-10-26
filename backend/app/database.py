from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Development ke liye SQLite. Baad mein PostgreSQL ka URL yahan daal dena:
# "postgresql://user:password@localhost/neuroguard"
DATABASE_URL = "sqlite:///./neuroguard.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
