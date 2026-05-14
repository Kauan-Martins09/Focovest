print("INICIOU")

from app.db import engine, Base
from app.models import *

print("MODELS IMPORTADOS")

Base.metadata.create_all(bind=engine)

print("TABELAS CRIADAS")