from pydantic import BaseModel
from datetime import date
from typing import Optional, List, Any

class UserCreate(BaseModel):
    email: str
    senha: str
    nome: str
    idade : int

class UserLog(BaseModel):
    email: str
    senha: str

class AnotacaoCreate(BaseModel):
    usuario_id: int
    titulo: str
    conteudo: str

class CompromissoCreate(BaseModel):
    usuario_id: int
    data: date
    descricao: str

class ResultadoCreate(BaseModel):
    usuario_id: int
    acertos: int
    total: int
    nota: int
    questoes: Optional[List[Any]] = None
    respostas: Optional[List[Any]] = None

class RedacaoCreate(BaseModel):
    usuario_id: int
    tema_ano: int
    tema_titulo: str
    texto: str
    linhas: int
    palavras: int
    paragrafos: int
    nota: int
    feedback: Optional[Any] = None