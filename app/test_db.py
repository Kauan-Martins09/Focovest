from db import engine

try:
    conn = engine.connect()
    print("CONECTOU")
    conn.close()
except Exception as e:
    print("ERRO:", e)