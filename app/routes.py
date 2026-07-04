from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User, Anotacao, Compromisso
from .schemas import UserCreate, UserLog, AnotacaoCreate, CompromissoCreate
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

@router.delete("/anotacao/{id}")
def deletar_anotacoes(
    id: int, 
    db: Session = Depends(get_db)
):
    anotacao = db.query(Anotacao).filter(Anotacao.id == id).first()
    if not anotacao:
        return {"msg": "Anotação não encontrada"}
    
    db.delete(anotacao)
    db.commit()
    return {"msg": "Anotação excluída com sucesso!"}

@router.post("/compromisso")
def criar_compromisso(
    compromisso: CompromissoCreate,
    db:  Session = Depends(get_db)
):
    novo = Compromisso(
        usuario_id=compromisso.usuario_id,
        data=compromisso.data,
        descricao=compromisso.descricao
    )

    db.add(novo)
    db.commit()
    return {"msg": "Compromisso salvo"}

@router.get("/compromisso/{usuario_id}")
def listar_compromisso(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    compromisso = db.query(Compromisso).filter(
        Compromisso.usuario_id == usuario_id
    ).all()

    return compromisso

@router.delete("/compromisso/{id}")
def deletar_compromisso(
    id: int,
    db: Session = Depends(get_db)
):
    compromisso = db.query(Compromisso).filter(Compromisso.id == id).first()
    if not compromisso:
        return{"msg": "Compromisso não encontrado"}
    
    db.delete(compromisso)
    db.commit()
    return {"msg": "Compromisso excluído com sucesso!"}