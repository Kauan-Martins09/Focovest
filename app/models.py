from sqlalchemy import Column, Integer, String
from .db import Base

class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150))
    senha = Column(String(255))
    nome = Column(String(100))
    idade = Column(Integer)