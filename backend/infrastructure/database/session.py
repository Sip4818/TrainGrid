from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.api.core.config import settings


def _build_engine():
    connect_args: dict[str, bool] = {}
    if settings.database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    return create_engine(settings.database_url, connect_args=connect_args)


engine = _build_engine()

# 'SessionLocal' is our factory for database sessions.
# We'll use this whenever we need to talk to the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 'Base' is the parent class for all our database models.
# It tracks all the tables we define.
Base = declarative_base()


# A helper function to get a database session and ensure it's closed afterward.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
