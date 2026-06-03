print("INICIOU")

from app.db import engine, Base
from app.models import *

print("MODELS IMPORTADOS")

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print("Erro no banco:", e)

print("TABELAS CRIADAS")
print(Base.metadata.tables.keys())