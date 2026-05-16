from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_senha(senha: str):
    # Limita a senha em 72 caracteres (padrão seguro do bcrypt)
    senha_truncada = senha[:72]
    return pwd_context.hash(senha_truncada)

def verificar_senha(senha: str, hash: str):
    # Também trunca na verificação pra ser consistente
    senha_truncada = senha[:72]
    return pwd_context.verify(senha_truncada, hash)