import os
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import User, UsoIA

# Limites mensais (podem ser trocados no Render sem mexer no código)
LIMITE_TOKENS_FREE = int(os.getenv("LIMITE_TOKENS_FREE", "20000"))
LIMITE_TOKENS_PREMIUM = int(os.getenv("LIMITE_TOKENS_PREMIUM", "200000"))

# Se a API não informar o uso, contamos este valor por chamada (evita IA "de graça")
TOKENS_ESTIMADOS_SEM_USAGE = 4000

# O banco guarda UTC; o "mês" do aluno começa à meia-noite de Brasília (UTC-3)
FUSO_BRASILIA = timedelta(hours=3)


def inicio_do_mes() -> datetime:
    agora_brasilia = datetime.utcnow() - FUSO_BRASILIA
    inicio = agora_brasilia.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return inicio + FUSO_BRASILIA  # volta para UTC


def proxima_renovacao() -> datetime:
    inicio = inicio_do_mes() - FUSO_BRASILIA  # em horário de Brasília
    if inicio.month == 12:
        proximo = inicio.replace(year=inicio.year + 1, month=1)
    else:
        proximo = inicio.replace(month=inicio.month + 1)
    return proximo + FUSO_BRASILIA  # em UTC


def eh_premium(conta: User) -> bool:
    # Equipe (admin/atendimento) tem os benefícios do Premium
    if conta.is_admin or conta.is_atendimento:
        return True
    if conta.plano != "premium":
        return False
    # Sem data de expiração = Premium sem vencimento
    return conta.plano_expira_em is None or conta.plano_expira_em > datetime.utcnow()


def tokens_usados_no_mes(db: Session, usuario_id: int) -> int:
    total = db.query(func.coalesce(func.sum(UsoIA.tokens_total), 0)).filter(
        UsoIA.usuario_id == usuario_id,
        UsoIA.criado_em >= inicio_do_mes()
    ).scalar()
    return int(total or 0)


def resumo_plano(db: Session, conta: User) -> dict:
    premium = eh_premium(conta)
    limite = LIMITE_TOKENS_PREMIUM if premium else LIMITE_TOKENS_FREE
    usados = tokens_usados_no_mes(db, conta.id)

    return {
        "plano": "premium" if premium else "free",
        "mostrar_anuncios": not premium,
        "tokens_usados": usados,
        "tokens_limite": limite,
        "tokens_restantes": max(0, limite - usados),
        "renova_em": proxima_renovacao(),
        "plano_expira_em": conta.plano_expira_em if (premium and conta.plano == "premium") else None,
    }


def registrar_uso_ia(db: Session, usuario_id: int, tipo: str, uso: dict | None) -> None:
    uso = uso or {}
    entrada = int(uso.get("prompt_tokens") or 0)
    saida = int(uso.get("completion_tokens") or 0)
    total = int(uso.get("total_tokens") or (entrada + saida))

    if total <= 0:
        total = TOKENS_ESTIMADOS_SEM_USAGE

    try:
        db.add(UsoIA(
            usuario_id=usuario_id,
            tipo=tipo,
            tokens_entrada=entrada,
            tokens_saida=saida,
            tokens_total=total,
        ))
        db.commit()
    except Exception as erro:
        # Falha ao registrar o uso nunca deve derrubar a correção do aluno
        db.rollback()
        print(f"ERRO AO REGISTRAR USO DA IA: {erro}")