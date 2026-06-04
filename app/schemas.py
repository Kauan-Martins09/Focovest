from pydantic import BaseModel
from datetime import date

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