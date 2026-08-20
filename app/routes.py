from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User, Anotacao, Compromisso, Resultado, Redacao
from .schemas import UserCreate, UserLog, AnotacaoCreate, CompromissoCreate, ResultadoCreate, RedacaoCreate
from .security import hash_senha, verificar_senha
import httpx
import random

def questao_completa(q):
    tinha_imagem_no_contexto = "![" in (q.get("context") or "")
    tem_arquivo = bool(q.get("files"))
    if tinha_imagem_no_contexto and not tem_arquivo:
        return False
    return True

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


@router.get("/treino/{disciplina}")
async def treino(disciplina: str, quantidade: int = 10):
    ano = random.choice(range(2009, 2024))
    todas_questoes = []
    offset = 0

    async with httpx.AsyncClient() as client:
        while True:
            resposta = await client.get(
                f"https://api.enem.dev/v1/exams/{ano}/questions?limit=50&offset={offset}"
            )
            dados = resposta.json()
            todas_questoes.extend(dados["questions"])

            if not dados["metadata"]["hasMore"]:
                break

            offset += 50

    questoes_filtradas = [q for q in todas_questoes if q["discipline"] == disciplina]
    questoes_filtradas = [q for q in questoes_filtradas if questao_completa(q)]
    questoes_sorteadas = random.sample(questoes_filtradas, min(quantidade, len(questoes_filtradas)))

    return questoes_sorteadas

@router.get("/prova")
async def gerar_prova(quantidade_por_area: int = 15):
    ano = random.choice(range(2009, 2024))
    todas_questoes = []
    offset = 0

    async with httpx.AsyncClient() as client:
        while True:
            resposta = await client.get(
                f"https://api.enem.dev/v1/exams/{ano}/questions?limit=50&offset={offset}"
            )
            dados = resposta.json()
            todas_questoes.extend(dados["questions"])

            if not dados["metadata"]["hasMore"]:
                break

            offset += 50

    areas = ["linguagens", "ciencias-humanas", "ciencias-natureza", "matematica"]
    prova = []

    for area in areas:
        questoes_area = [q for q in todas_questoes if q["discipline"] == area]
        questoes_area = [q for q in questoes_area if questao_completa(q)]
        selecionadas = random.sample(questoes_area, min(quantidade_por_area, len(questoes_area)))
        prova.extend(selecionadas)

    random.shuffle(prova)

    return {"ano": ano, "questoes": prova}


@router.post("/resultado")
def criar_resultado(resultado: ResultadoCreate, db: Session = Depends(get_db)):
    novo = Resultado(
        usuario_id=resultado.usuario_id,
        acertos=resultado.acertos,
        total=resultado.total,
        nota=resultado.nota,
        questoes=resultado.questoes,
        respostas=resultado.respostas
    )

    db.add(novo)
    db.commit()
    db.refresh(novo)

    return {"msg": "Resultado salvo", "id": novo.id}


@router.get("/resultado/{usuario_id}")
def listar_resultados(usuario_id: int, db: Session = Depends(get_db)):
    resultados = db.query(Resultado).filter(
        Resultado.usuario_id == usuario_id
    ).order_by(Resultado.data.desc()).all()

    return resultados

@router.post("/redacao")
def criar_redacao(redacao: RedacaoCreate, db: Session = Depends(get_db)):
    nova = Redacao(
        usuario_id=redacao.usuario_id,
        tema_ano=redacao.tema_ano,
        tema_titulo=redacao.tema_titulo,
        texto=redacao.texto,
        linhas=redacao.linhas,
        palavras=redacao.palavras,
        paragrafos=redacao.paragrafos,
        nota=redacao.nota,
        feedback=redacao.feedback
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return {"msg": "Redação salva", "id": nova.id}

@router.get("/redacao/{usuario_id}")
def listar_redacoes(usuario_id: int, db: Session = Depends(get_db)):
    redacoes = db.query(Redacao).filter(
        Redacao.usuario_id == usuario_id
    ).order_by(Redacao.data.desc()).all()
    return redacoes