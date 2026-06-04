from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User, Anotacao
from .schemas import UserCreate, UserLog, AnotacaoCreate
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
    
    return {
        "success": True,
        "usuario_id": usuario.id,
        "nome": usuario.nome
            }

@router.post("/anotacao")
def criar_anotacao(
    anotacao: AnotacaoCreate,
    db: Session = Depends(get_db)
):
    
    nova = Anotacao(
        usuario_id=anotacao.usuario_id,
        titulo=anotacao.titulo,
        conteudo=anotacao.conteudo
    )

    db.add(nova)
    db.commit()

    return {"msg": "Anotação salva"}

@router.get("/anotacao/{usuario_id}")
def listar_anotacoes(
    usuario_id: int, 
    db: Session = Depends(get_db)
):
    
    anotacoes = db.query(Anotacao).filter(
        Anotacao.usuario_id == usuario_id
    ).all()

    return anotacoes