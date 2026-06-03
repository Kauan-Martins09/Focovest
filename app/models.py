from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey
from .db import Base

class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False)
    senha = Column(String(255))
    nome = Column(String(100))
    idade = Column(Integer)

class Anotacao(Base):
    __tablename__ = "anotacoes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    titulo = Column(String(255), nullable=False)
    conteudo = Column(Text, nullable=False)

class Compromisso(Base):
    __tablename__ = "compromissos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    data = Column(Date, nullable=False)
    descricao = Column(String(500), nullable=False)
