from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "mysql+pymysql://root:xcljXJdkIKBQCSxztCRjUAMmbNSGFhPH@hopper.proxy.rlwy.net:19610/railway"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=280
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()