from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    senha: str
    nome: str
    idade : int

class UserLog(BaseModel):
    email: str
    senha: str