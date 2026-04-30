from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User
from .schemas import UserCreate
from .schemas import UserLog

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
    
    novo = User(
        email=user.email,
        senha=user.senha,
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
    if usuario.senha != user.senha:
        return{"msg": "Senha incorreta"}
    
    return {"msg": "Login efetuado"}