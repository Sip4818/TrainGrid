from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# The database URL tells SQLAlchemy where to find our database file.
# "sqlite:///./traingrid.db" means a file named 'traingrid.db' in the current folder.
SQLALCHEMY_DATABASE_URL = "sqlite:///./traingrid.db"

# The 'engine' is the low-level connection to the database.
# check_same_thread=False is a specific setting needed for SQLite when used with FastAPI.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

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
