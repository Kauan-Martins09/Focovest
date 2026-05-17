import bcrypt

def hash_senha(senha: str) -> str:
    senha_bytes = senha[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(senha_bytes, salt)
    return hashed.decode('utf-8')

def verificar_senha(senha: str, hashed_senha: str) -> bool:
    senha_bytes = senha[:72].encode('utf-8')
    hashed_bytes = hashed_senha.encode('utf-8')
    return bcrypt.checkpw(senha_bytes, hashed_bytes)