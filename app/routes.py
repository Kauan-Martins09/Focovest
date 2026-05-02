from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User
from .schemas import UserCreate
from .schemas import UserLog
from .security import hash_senha, verificar_senha

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/cadastro")
def cadastro(user: UserCreate, db: Session = Depends(get_db)):
    usuario = db.query(User).filter(User.email == user.email).first()
    if  usuario:
        return{"msg": "Usuário ja cadastrado"}
    
    senha_hash = hash_senha(user.senha)

    novo = User(
        email=user.email,
        senha=senha_hash,
        nome=user.nome,
        idade=user.idade
    )

    db.add(novo)
    db.commit()

    return{"msg": "usuario cadastrado"}
        

@router.post("/login")
def login(user: UserLog, db: Session = Depends(get_db)):
    usuario = db.query(User).filter(User.email == user.email).first()
    if not usuario:
        return {"msg": "usário não encontrado"}
    if not verificar_senha(user.senha, usuario.senha):
        return{"msg": "Senha incorreta"}
    
    return {"success": True}