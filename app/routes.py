from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User, Anotacao, Compromisso, Resultado, Redacao, AdminLog, ConversaAtendimento, MensagemAtendimento, TemaGerado, UsoIA
from .schemas import UserCreate, UserLog, AnotacaoCreate, CompromissoCreate, ResultadoCreate, RedacaoCreate, MensagemAtendimentoCreate
from .security import (
    hash_senha,
    verificar_senha,
    criar_token,
    usuario_atual
)

import httpx
import random
import time
from datetime import datetime, timedelta
from .gemini_redacao import corrigir_redacao_gemini, GeminiError, gerar_tema_redacao, sortear_eixo_recorte
from .correcao_regras import corrigir_redacao_regras
from .planos import resumo_plano, registrar_uso_ia

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

@router.get("/atendimento/conversa")
def obter_conversa_atendimento(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    conversa = db.query(ConversaAtendimento).filter(
        ConversaAtendimento.usuario_id == usuario["usuario_id"]
    ).first()

    if not conversa:
        conversa = ConversaAtendimento(
            usuario_id=usuario["usuario_id"]
        )

        db.add(conversa)
        db.commit()
        db.refresh(conversa)

    return {
        "id": conversa.id,
        "usuario_id": conversa.usuario_id,
        "status": conversa.status,
        "criada_em": conversa.criada_em,
        "atualizada_em": conversa.atualizada_em
    }

@router.post("/atendimento/conversa/{conversa_id}/mensagem")
def enviar_mensagem_atendimento(
    conversa_id: int,
    mensagem: MensagemAtendimentoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    conversa = db.query(ConversaAtendimento).filter(
        ConversaAtendimento.id == conversa_id
    ).first()

    if not conversa:
        raise HTTPException(
            status_code=404,
            detail="Conversa não encontrada"
        )

    pode_enviar = (
        conversa.usuario_id == usuario["usuario_id"]
        or usuario.get("is_atendimento")
    )

    if not pode_enviar:
        raise HTTPException(
            status_code=403,
            detail="Você não tem acesso a esta conversa"
        )

    texto = mensagem.texto.strip()

    if not texto:
        raise HTTPException(
            status_code=400,
            detail="A mensagem não pode ficar vazia"
        )

    nova_mensagem = MensagemAtendimento(
        conversa_id=conversa.id,
        autor_id=usuario["usuario_id"],
        texto=texto
    )

    if usuario.get("is_admin") or usuario.get("is_atendimento"):
        conversa.status = "em_atendimento"
    else:
        conversa.status = "aberta"

    db.add(nova_mensagem)
    db.commit()
    db.refresh(nova_mensagem)

    return {
        "id": nova_mensagem.id,
        "conversa_id": nova_mensagem.conversa_id,
        "autor_id": nova_mensagem.autor_id,
        "texto": nova_mensagem.texto,
        "enviada_em": nova_mensagem.enviada_em
    }

@router.get("/atendimento/conversa/{conversa_id}/mensagens")
def listar_mensagens_atendimento(
    conversa_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    conversa = db.query(ConversaAtendimento).filter(
        ConversaAtendimento.id == conversa_id
    ).first()

    if not conversa:
        raise HTTPException(
            status_code=404,
            detail="Conversa não encontrada"
        )

    pode_visualizar = (
        conversa.usuario_id == usuario["usuario_id"]
        or usuario.get("is_atendimento")
    )

    if not pode_visualizar:
        raise HTTPException(
            status_code=403,
            detail="Você não tem acesso a esta conversa"
        )

    mensagens = db.query(MensagemAtendimento).filter(
        MensagemAtendimento.conversa_id == conversa_id
    ).order_by(
        MensagemAtendimento.enviada_em.asc()
    ).all()

    return [
        {
            "id": mensagem.id,
            "conversa_id": mensagem.conversa_id,
            "autor_id": mensagem.autor_id,
            "texto": mensagem.texto,
            "enviada_em": mensagem.enviada_em
        }
        for mensagem in mensagens
    ]

@router.get("/atendimento/conversas")
def listar_conversas_atendimento(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_atendimento"):
        raise HTTPException(
            status_code=403,
            detail="Apenas usuários de atendimento podem listar as conversas"
        )

    conversas = db.query(
        ConversaAtendimento,
        User.nome,
        User.email
    ).join(
        User,
        ConversaAtendimento.usuario_id == User.id
    ).order_by(
        ConversaAtendimento.atualizada_em.desc()
    ).all()

    return [
        {
            "id": conversa.id,
            "usuario_id": conversa.usuario_id,
            "usuario_nome": nome,
            "usuario_email": email,
            "status": conversa.status,
            "criada_em": conversa.criada_em,
            "atualizada_em": conversa.atualizada_em
        }
        for conversa, nome, email in conversas
    ]

@router.patch("/atendimento/conversa/{conversa_id}/status")
def alterar_status_conversa(
    conversa_id: int,
    status: str,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_atendimento"):
        raise HTTPException(
            status_code=403,
            detail="Apenas usuários de atendimento podem alterar o status"
        )

    status_validos = {
        "aberta",
        "em_atendimento",
        "encerrada"
    }

    if status not in status_validos:
        raise HTTPException(
            status_code=400,
            detail="Status inválido"
        )

    conversa = db.query(ConversaAtendimento).filter(
        ConversaAtendimento.id == conversa_id
    ).first()

    if not conversa:
        raise HTTPException(
            status_code=404,
            detail="Conversa não encontrada"
        )

    conversa.status = status

    db.commit()
    db.refresh(conversa)

    return {
        "id": conversa.id,
        "usuario_id": conversa.usuario_id,
        "status": conversa.status,
        "atualizada_em": conversa.atualizada_em
    }


@router.post("/cadastro")
def cadastro(user: UserCreate, db: Session = Depends(get_db)):
    usuario = db.query(User).filter(User.email == user.email).first()

    if usuario:
        return {
            "success": False,
            "msg": "E-mail já cadastrado",
            "redirect": "login"          # opcional, mas ajuda o frontend
        }
    
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
    
    if not usuario or not verificar_senha(user.senha, usuario.senha):
        return {
            "success": False,
            "msg": "E-mail ou senha incorretos"
        }

    token = criar_token({
        "usuario_id": usuario.id,
        "is_admin": usuario.is_admin,
        "is_atendimento": usuario.is_atendimento
    })
    
    return {
        "success": True,
        "token": token,
        "usuario_id": usuario.id,
        "nome": usuario.nome,
        "is_admin": usuario.is_admin,
        "is_atendimento": usuario.is_atendimento
    }

@router.post("/anotacao")
def criar_anotacao(
    anotacao: AnotacaoCreate,
    db: Session = Depends(get_db),
    usuario = Depends(usuario_atual)
):
    # Força o usuario_id do token (ignora o que veio no body)
    nova = Anotacao(
        usuario_id=usuario["usuario_id"],
        titulo=anotacao.titulo,
        conteudo=anotacao.conteudo
    )

    db.add(nova)
    db.commit()

    return {"msg": "Anotação salva"}

@router.get("/anotacao/{usuario_id}")
def listar_anotacoes(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario = Depends(usuario_atual)
):
    # Só pode ver as próprias anotações (admin pode ver qualquer uma)
    if usuario["usuario_id"] != usuario_id and not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    anotacoes = db.query(Anotacao).filter(
        Anotacao.usuario_id == usuario_id
    ).all()

    return anotacoes

@router.delete("/anotacao/{id}")
def deletar_anotacoes(
    id: int,
    db: Session = Depends(get_db),
    usuario = Depends(usuario_atual)
):
    anotacao = db.query(Anotacao).filter(Anotacao.id == id).first()
    if not anotacao:
        return {"msg": "Anotação não encontrada"}

    # Só o dono ou admin pode apagar
    if anotacao.usuario_id != usuario["usuario_id"] and not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    db.delete(anotacao)
    db.commit()
    return {"msg": "Anotação excluída com sucesso!"}

@router.post("/compromisso")
def criar_compromisso(
    compromisso: CompromissoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    novo = Compromisso(
        usuario_id=usuario["usuario_id"],
        data=compromisso.data,
        descricao=compromisso.descricao
    )
    db.add(novo)
    db.commit()
    return {"msg": "Compromisso salvo"}

@router.get("/compromisso/{usuario_id}")
def listar_compromisso(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if usuario["usuario_id"] != usuario_id and not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    return db.query(Compromisso).filter(
        Compromisso.usuario_id == usuario_id
    ).all()

@router.delete("/compromisso/{id}")
def deletar_compromisso(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    compromisso = db.query(Compromisso).filter(Compromisso.id == id).first()
    if not compromisso:
        return {"msg": "Compromisso não encontrado"}

    if compromisso.usuario_id != usuario["usuario_id"] and not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

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
def criar_resultado(
    resultado: ResultadoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    novo = Resultado(
        usuario_id=usuario["usuario_id"],
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
def listar_resultados(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if usuario["usuario_id"] != usuario_id and not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    return db.query(Resultado).filter(
        Resultado.usuario_id == usuario_id
    ).order_by(Resultado.data.desc()).all()


LIMITE_CARACTERES_REDACAO = 8000


@router.post("/redacao")
def criar_redacao(
    redacao: RedacaoCreate,
    db: Session = Depends(get_db),
    usuario = Depends(usuario_atual)
):
    if len(redacao.texto) > LIMITE_CARACTERES_REDACAO:
        raise HTTPException(status_code=400, detail="Redação muito longa")

    # Regras rodam sempre: dão linhas/palavras/parágrafos e servem de fallback.
    # O servidor não confia mais em nota/feedback vindos do navegador.
    regras = corrigir_redacao_regras(redacao.texto, redacao.tema_titulo)

    nota = regras["nota"]
    competencias = regras["competencias"]
    feedback = {**regras, "origem": "regras"}
    origem = "regras"

    tema = redacao.tema_titulo
    if redacao.tema_ano:
        tema = f"{tema} ({redacao.tema_ano})"

    conta = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    if not conta:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    plano = resumo_plano(db, conta)
    motivo_regras = None  # None = a IA corrigiu normalmente

    if plano["tokens_restantes"] <= 0:
        # Limite do mês esgotado: não chama a IA, usa as regras (gratuitas)
        motivo_regras = "limite"
    else:
        try:
            r = corrigir_redacao_gemini(tema, redacao.texto)
            competencias = {c: r[c] for c in ("c1", "c2", "c3", "c4", "c5")}
            nota = r["total"]
            feedback = {
                "origem": "ia",
                "competencias": competencias,
                "comentario": r["feedback"]
            }
            origem = "ia"
            registrar_uso_ia(db, conta.id, "correcao_redacao", r.get("uso"))
        except GeminiError as erro:
            print(f"ERRO NO GEMINI: {erro}")
            motivo_regras = "erro"

    nova = Redacao(
        usuario_id=usuario["usuario_id"],
        tema_ano=redacao.tema_ano,
        tema_titulo=redacao.tema_titulo,
        texto=redacao.texto,
        linhas=regras["linhas"],
        palavras=regras["palavras"],
        paragrafos=regras["paragrafos"],
        nota=nota,
        feedback=feedback
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    plano = resumo_plano(db, conta)  # recalcula já com o uso desta correção

    return {
        "msg": "Redação salva",
        "id": nova.id,
        "nota": nota,
        "competencias": competencias,
        "feedback": feedback,
        "origem": origem,
        "linhas": regras["linhas"],
        "palavras": regras["palavras"],
        "paragrafos": regras["paragrafos"],
        "motivo_regras": motivo_regras,
        "plano": plano
    }

_ultimo_tema_por_usuario = {}  # trava simples contra cliques seguidos (gasta crédito)


@router.get("/tema-redacao/aleatorio")
def gerar_tema_aleatorio(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):

    conta = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    if not conta:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    if resumo_plano(db, conta)["tokens_restantes"] <= 0:
        raise HTTPException(
            status_code=429,
            detail="Você atingiu o limite mensal de IA do seu plano. Escolha um dos temas oficiais da lista ou aguarde a renovação."
        )
    
    agora = time.time()
    if agora - _ultimo_tema_por_usuario.get(usuario["usuario_id"], 0) < 5:
        raise HTTPException(status_code=429, detail="Aguarde alguns segundos para gerar outro tema")
    _ultimo_tema_por_usuario[usuario["usuario_id"]] = agora

    recentes = [
        t.titulo for t in
        db.query(TemaGerado).order_by(TemaGerado.id.desc()).limit(40).all()
    ]
    recentes_norm = {t.strip().lower() for t in recentes}

    for _ in range(3):
        eixo, recorte = sortear_eixo_recorte()
        try:
            tema = gerar_tema_redacao(eixo, recorte, recentes)
        except GeminiError as erro:
            print(f"ERRO AO GERAR TEMA: {erro}")
            continue

        # Conta o gasto mesmo se o tema vier repetido: a chamada foi cobrada
        registrar_uso_ia(db, conta.id, "gerar_tema", tema.get("uso"))

        if tema["titulo"].strip().lower() in recentes_norm:
            continue  # a IA repetiu um tema: sorteia de novo

        db.add(TemaGerado(titulo=tema["titulo"], eixo=eixo))
        db.commit()
        return {
            "tema_ano": datetime.utcnow().year,
            "tema_titulo": tema["titulo"],
            "textos_motivadores": tema["textos_motivadores"],
            "gerado_por_ia": True,
        }

    raise HTTPException(status_code=503, detail="Não foi possível gerar um tema agora. Tente novamente.")

@router.get("/redacao/{usuario_id}")
def listar_redacoes(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if usuario["usuario_id"] != usuario_id and not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    return db.query(Redacao).filter(
        Redacao.usuario_id == usuario_id
    ).order_by(Redacao.data.desc()).all()

@router.get("/plano")
def obter_plano(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    conta = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    if not conta:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return resumo_plano(db, conta)

# ===================== ADMIN =====================
def registrar_log(db: Session, admin: User, acao: str, alvo_tipo: str, alvo_id: int | None, snapshot: dict | None):
    log = AdminLog(
        admin_id=admin.id,
        admin_nome=admin.nome or admin.email,
        acao=acao,
        alvo_tipo=alvo_tipo,
        alvo_id=alvo_id,
        alvo_snapshot=snapshot
    )
    db.add(log)
    db.commit()


@router.get("/admin/usuarios")
def admin_listar_usuarios(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    usuarios = db.query(User).all()
    return [
        {"id": u.id, "nome": u.nome, "email": u.email, "idade": u.idade, "is_admin": u.is_admin}
        for u in usuarios
    ]


@router.delete("/admin/usuario/{id}")
def admin_deletar_usuario(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    if id == usuario["usuario_id"]:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")

    usuario_alvo = db.query(User).filter(User.id == id).first()
    if not usuario_alvo:
        return {"msg": "Usuário não encontrado"}

    db.query(Anotacao).filter(Anotacao.usuario_id == id).delete()
    db.query(Compromisso).filter(Compromisso.usuario_id == id).delete()
    db.query(Resultado).filter(Resultado.usuario_id == id).delete()
    db.query(Redacao).filter(Redacao.usuario_id == id).delete()
    db.query(AdminLog).filter(AdminLog.admin_id == id).delete()
    db.query(UsoIA).filter(UsoIA.usuario_id == id).delete()

    db.delete(usuario_alvo)
    db.commit()
    return {"msg": "Usuário e todos os seus dados foram excluídos"}


@router.get("/admin/anotacoes")
def admin_listar_anotacoes(
    db: Session = Depends(get_db),
    usuario = Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    registros = (
        db.query(Anotacao, User.nome)
        .join(User, Anotacao.usuario_id == User.id)
        .all()
    )

    return [
        {
            "id": a.id,
            "usuario_nome": nome,
            "titulo": a.titulo,
            "conteudo": a.conteudo
        }
        for a, nome in registros
    ]


@router.delete("/admin/anotacao/{id}")
def admin_deletar_anotacao(
    id: int,
    db: Session = Depends(get_db),
    usuario = Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    anotacao = db.query(Anotacao).filter(Anotacao.id == id).first()
    if not anotacao:
        raise HTTPException(status_code=404, detail="Anotação não encontrada")

    db.delete(anotacao)
    db.commit()
    return {"msg": "Anotação excluída com sucesso"}


@router.get("/admin/compromissos")
def admin_listar_compromissos(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    registros = db.query(Compromisso, User.nome).join(
        User, Compromisso.usuario_id == User.id
    ).all()
    return [
        {"id": c.id, "usuario_nome": nome, "data": c.data, "descricao": c.descricao}
        for c, nome in registros
    ]


@router.delete("/admin/compromisso/{id}")
def admin_deletar_compromisso(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    compromisso = db.query(Compromisso).filter(Compromisso.id == id).first()
    if not compromisso:
        return {"msg": "Compromisso não encontrado"}
    db.delete(compromisso)
    db.commit()
    return {"msg": "Compromisso excluído"}


@router.get("/admin/resultados")
def admin_listar_resultados(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    registros = db.query(Resultado, User.nome).join(
        User, Resultado.usuario_id == User.id
    ).order_by(Resultado.data.desc()).all()
    return [
        {"id": r.id, "usuario_nome": nome, "acertos": r.acertos, "total": r.total, "nota": r.nota, "data": r.data}
        for r, nome in registros
    ]


@router.delete("/admin/resultado/{id}")
def admin_deletar_resultado(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    resultado = db.query(Resultado).filter(Resultado.id == id).first()
    if not resultado:
        return {"msg": "Resultado não encontrado"}
    db.delete(resultado)
    db.commit()
    return {"msg": "Resultado excluído"}


@router.get("/admin/redacoes")
def admin_listar_redacoes(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    registros = db.query(Redacao, User.nome).join(
        User, Redacao.usuario_id == User.id
    ).order_by(Redacao.data.desc()).all()
    return [
        {"id": r.id, "usuario_nome": nome, "tema_titulo": r.tema_titulo, "nota": r.nota, "data": r.data}
        for r, nome in registros
    ]


@router.post("/admin/usuario/{id}/promover")
def admin_promover_usuario(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    admin = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    alvo = db.query(User).filter(User.id == id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if alvo.is_admin:
        return {"msg": "Usuário já é admin"}

    alvo.is_admin = True
    db.commit()

    snapshot = {
        "id": alvo.id,
        "nome": alvo.nome,
        "email": alvo.email,
        "idade": alvo.idade,
        "is_admin": True
    }
    registrar_log(db, admin, "promover_admin", "usuario", id, snapshot)
    return {"msg": f"{alvo.nome} agora é admin"}


@router.post("/admin/usuario/{id}/promover-atendimento")
def admin_promover_atendimento(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    admin = db.query(User).filter(
        User.id == usuario["usuario_id"]
    ).first()

    alvo = db.query(User).filter(User.id == id).first()

    if not alvo:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    if alvo.is_atendimento:
        return {"msg": "Usuário já faz parte do atendimento"}

    alvo.is_atendimento = True
    db.commit()

    snapshot = {
        "id": alvo.id,
        "nome": alvo.nome,
        "email": alvo.email,
        "idade": alvo.idade,
        "is_admin": alvo.is_admin,
        "is_atendimento": True
    }

    registrar_log(
        db,
        admin,
        "promover_atendimento",
        "usuario",
        id,
        snapshot
    )

    return {
        "msg": f"{alvo.nome} agora faz parte do atendimento",
        "is_atendimento": True
    }

@router.post("/admin/usuario/{id}/rebaixar-atendimento")
def admin_rebaixar_atendimento(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    admin = db.query(User).filter(
        User.id == usuario["usuario_id"]
    ).first()

    alvo = db.query(User).filter(User.id == id).first()

    if not alvo:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    if not alvo.is_atendimento:
        return {"msg": "Usuário já não faz parte do atendimento"}

    alvo.is_atendimento = False
    db.commit()

    snapshot = {
        "id": alvo.id,
        "nome": alvo.nome,
        "email": alvo.email,
        "idade": alvo.idade,
        "is_admin": alvo.is_admin,
        "is_atendimento": False
    }

    registrar_log(
        db,
        admin,
        "rebaixar_atendimento",
        "usuario",
        id,
        snapshot
    )

    return {
        "msg": f"{alvo.nome} não faz mais parte do atendimento",
        "is_atendimento": False
    }


@router.post("/admin/usuario/{id}/rebaixar")
def admin_rebaixar_usuario(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    if id == usuario["usuario_id"]:
        raise HTTPException(status_code=400, detail="Você não pode rebaixar a si mesmo")

    admin = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    alvo = db.query(User).filter(User.id == id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if not alvo.is_admin:
        return {"msg": "Usuário já não é admin"}

    alvo.is_admin = False
    db.commit()

    snapshot = {
        "id": alvo.id,
        "nome": alvo.nome,
        "email": alvo.email,
        "idade": alvo.idade,
        "is_admin": False
    }
    registrar_log(db, admin, "rebaixar_admin", "usuario", id, snapshot)
    return {"msg": f"{alvo.nome} não é mais admin"}


@router.post("/admin/usuario/{id}/ativar-premium")
def admin_ativar_premium(
    id: int,
    dias: int = 30,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    if dias < 1 or dias > 3650:
        raise HTTPException(status_code=400, detail="Informe de 1 a 3650 dias")

    admin = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    alvo = db.query(User).filter(User.id == id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Se já é Premium vigente, soma os dias ao vencimento atual (não perde dias pagos)
    agora = datetime.utcnow()
    base = agora
    if alvo.plano == "premium" and alvo.plano_expira_em and alvo.plano_expira_em > agora:
        base = alvo.plano_expira_em

    alvo.plano = "premium"
    alvo.plano_expira_em = base + timedelta(days=dias)
    db.commit()

    registrar_log(db, admin, "ativar_premium", "usuario", id, {
        "id": alvo.id,
        "nome": alvo.nome,
        "email": alvo.email,
        "plano": "premium",
        "dias": dias,
        "plano_expira_em": alvo.plano_expira_em.isoformat()
    })

    return {
        "msg": f"{alvo.nome} agora é Premium",
        "plano_expira_em": alvo.plano_expira_em
    }


@router.post("/admin/usuario/{id}/desativar-premium")
def admin_desativar_premium(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    admin = db.query(User).filter(User.id == usuario["usuario_id"]).first()
    alvo = db.query(User).filter(User.id == id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if alvo.plano != "premium":
        return {"msg": "Usuário já está no plano Free"}

    alvo.plano = "free"
    alvo.plano_expira_em = None
    db.commit()

    registrar_log(db, admin, "desativar_premium", "usuario", id, {
        "id": alvo.id,
        "nome": alvo.nome,
        "email": alvo.email,
        "plano": "free"
    })

    return {"msg": f"{alvo.nome} voltou ao plano Free"}

@router.get("/admin/logs")
def admin_listar_logs(
    db: Session = Depends(get_db),
    usuario=Depends(usuario_atual)
):
    if not usuario.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso negado")

    logs = db.query(AdminLog).order_by(AdminLog.data.desc()).limit(200).all()
    return [
        {
            "id": l.id,
            "admin_id": l.admin_id,
            "admin_nome": l.admin_nome,
            "acao": l.acao,
            "alvo_tipo": l.alvo_tipo,
            "alvo_id": l.alvo_id,
            "alvo_snapshot": l.alvo_snapshot,
            "data": l.data
        }
        for l in logs
    ]