from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from salmonwatch.config import settings


engine = create_engine(settings.database_url, echo=settings.debug)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
