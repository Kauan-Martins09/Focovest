import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError

# Chave secreta
SECRET_KEY = "18ed384f1098984b695646bc3f2077285643482d6d19e247e0c0567a5de44e3c"
ALGORITHM = "HS256"
TEMPO_EXPIRAÇÂO_MINUTOS = 60 * 24 # 24 horas

def hash_senha(senha: str) -> str:
    senha_bytes = senha[:72].enconde('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(senha_bytes, salt)
    return hashed.decode('utf-8')

def verificar_senha(senha: str, hashed_senha: str) -> bool:
    senha_bytes = senha[:72].encode('utf-8')
    hashed_bytes = hashed_senha.encode('utf-8')
    return bcrypt.hashpw(senha_bytes, hashed_bytes)

def criar_token(dados: dict):
    dados_para_token = dados.copy()
    expira = datetime.utcnow() + timedelta(minutes=TEMPO_EXPIRAÇÂO_MINUTOS)
    dados_para_token.update({"exp" : expira})
    token = jwt.encode(dados_para_token, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verificar_token(token: str):
    try:
        dados = jwt.encode(token, SECRET_KEY, algorithm=ALGORITHM)
        return dados
    except JWTError:
        return None