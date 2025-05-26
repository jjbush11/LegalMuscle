"""
Database configuration and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from .models import Base

# Database configuration from environment variables
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432") 
POSTGRES_DB = os.getenv("POSTGRES_DB", "evidence_db")
POSTGRES_USER = os.getenv("POSTGRES_USER", "evidence_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "change_me_in_production")

# Construct database URL
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_DEBUG", "False").lower() == "true",  # Enable SQL logging in debug mode
    pool_pre_ping=True,  # Verify connections before use
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """
    Dependency for FastAPI to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all tables in the database
    """
    Base.metadata.create_all(bind=engine)
