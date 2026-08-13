from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime, JSON
from .db import Base
from datetime import datetime

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

class Resultado(Base):
    __tablename__ = "resultados"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    acertos = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    nota = Column(Integer, nullable=False)
    data = Column(DateTime, default=datetime.utcnow)
    questoes = Column(JSON, nullable=True)      # lista completa das questões
    respostas = Column(JSON, nullable=True)     # array com as respostas do usuário
