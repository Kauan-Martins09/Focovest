import math
import re
import unicodedata


def _arredondar(n):
    # Math.round do JS arredonda 2.5 para 3; o round() do Python arredonda 2.5 para 2.
    # Por isso usamos floor(x + 0.5), que reproduz o comportamento do JS.
    return int(math.floor(n / 40 + 0.5)) * 40


def _sem_acentos(s):
    return re.sub(r"[\u0300-\u036f]", "", unicodedata.normalize("NFD", s))


def _dividir_paragrafos(texto: str) -> list:
    # Cada linha não vazia é um parágrafo (o aluno costuma separar só com Enter).
    # Uma primeira linha curta e sem pontuação final é tratada como título e não conta.
    blocos = [b.strip() for b in re.split(r"\n+", texto) if b.strip()]
    if len(blocos) > 1 and len(blocos[0]) <= 120 and not re.search(r"[.!?…]$", blocos[0]):
        blocos.pop(0)
    return blocos


def corrigir_redacao_regras(texto: str, tema_titulo: str) -> dict:
    linhas = len(texto.split("\n"))
    palavras = len(texto.strip().split())
    paragrafos = _dividir_paragrafos(texto)
    num_paragrafos = len(paragrafos)
    texto_lower = texto.lower()

    # --- Competência 1: norma culta ---
    c1 = 160
    erros_comuns = [
        (r"\bvc\b|\btb\b|\bpq\b|\bqdo\b", 20, "Evite abreviações informais (vc, tb, pq)."),
        (r"\bnao\b", 10, "Atenção à acentuação (não)."),
        (r"\bvoce\b", 10, "Prefira 'você' com acentuação."),
        (r"!!!+|\?\?\?+", 15, "Evite excesso de pontuação emotiva."),
    ]
    avisos_c1 = []
    for padrao, penalidade, msg in erros_comuns:
        # re.ASCII faz o \b se comportar como no JavaScript
        if re.search(padrao, texto, re.IGNORECASE | re.ASCII):
            c1 = max(40, c1 - penalidade)
            avisos_c1.append(msg)
    if palavras < 80:
        c1 = max(40, c1 - 30)
        avisos_c1.append("Texto muito curto para avaliar bem a norma culta.")

    # --- Competência 2: compreensão do tema ---
    palavras_tema = [
        p for p in _sem_acentos(tema_titulo.lower()).split() if len(p) > 4
    ]
    texto_norm = _sem_acentos(texto_lower)
    hits = sum(1 for p in palavras_tema if p in texto_norm)
    cobertura = hits / len(palavras_tema) if palavras_tema else 0
    if cobertura >= 0.4:
        c2 = 180
    elif cobertura >= 0.25:
        c2 = 140
    elif cobertura >= 0.1:
        c2 = 100
    else:
        c2 = 60
    if palavras < 100:
        c2 = min(c2, 100)

    # --- Competência 3: argumentação / repertório ---
    marcadores_argumento = [
        "segundo", "de acordo", "conforme", "por exemplo", "ou seja",
        "além disso", "dessa forma", "portanto", "assim", "é possível",
        "dados", "pesquisa", "estudo", "história", "filosofia", "sociologia",
        "constituição", "lei", "direito", "ibge", "onu", "governo",
    ]
    repertorio = sum(1 for m in marcadores_argumento if m in texto_lower)
    if repertorio >= 5:
        c3 = 180
    elif repertorio >= 3:
        c3 = 140
    elif repertorio >= 1:
        c3 = 100
    else:
        c3 = 60
    if num_paragrafos < 3:
        c3 = min(c3, 100)

    # --- Competência 4: coesão ---
    conectivos = [
        "além disso", "portanto", "dessa forma", "assim", "contudo",
        "entretanto", "no entanto", "por outro lado", "em primeiro lugar",
        "em segundo lugar", "por fim", "logo", "desse modo", "ainda",
        "também", "já que", "uma vez que", "visto que", "embora",
    ]
    coesao = sum(1 for c in conectivos if c in texto_lower)
    if coesao >= 5:
        c4 = 180
    elif coesao >= 3:
        c4 = 150
    elif coesao >= 1:
        c4 = 110
    else:
        c4 = 70
    if 3 <= num_paragrafos <= 5:
        c4 = min(200, c4 + 20)

    # --- Competência 5: proposta de intervenção ---
    marcadores_intervencao = [
        "é necessário", "é preciso", "deve-se", "o governo", "o estado",
        "a escola", "a mídia", "campanha", "política pública", "projeto",
        "investir", "criar", "implementar", "promover", "conscientizar",
        "educação", "lei", "fiscalizar", "parceria", "sociedade",
    ]
    intervencao = sum(1 for m in marcadores_intervencao if m in texto_lower)
    ultimo_bloco = paragrafos[-1].lower() if paragrafos else ""
    no_final = sum(1 for m in marcadores_intervencao if m in ultimo_bloco)

    if intervencao >= 4 and no_final >= 2:
        c5 = 180
    elif intervencao >= 3:
        c5 = 140
    elif intervencao >= 2:
        c5 = 100
    elif intervencao >= 1:
        c5 = 60
    else:
        c5 = 40

    # --- Penalidades gerais de tamanho ---
    if linhas > 30:
        c1 = max(40, c1 - 20)
        c2 = max(40, c2 - 20)
    if palavras < 50:
        c1 = c2 = c3 = c4 = c5 = 40

    c1, c2, c3, c4, c5 = (min(200, max(0, _arredondar(c))) for c in (c1, c2, c3, c4, c5))

    return {
        "linhas": linhas,
        "palavras": palavras,
        "paragrafos": num_paragrafos,
        "competencias": {"c1": c1, "c2": c2, "c3": c3, "c4": c4, "c5": c5},
        "nota": c1 + c2 + c3 + c4 + c5,
        "avisosC1": avisos_c1,
        "coberturaTema": int(math.floor(cobertura * 100 + 0.5)),
        "repertorio": repertorio,
        "coesao": coesao,
        "intervencao": intervencao,
    }
