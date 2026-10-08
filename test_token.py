from app.security import criar_token, verificar_token

token = criar_token({
    "usuario_id": 123,
    "is_admin": False
})

print("Token criado:")
print(token)

dados = verificar_token(token)

print("\nDados recuperados:")
print(dados)

assert dados is not None
assert dados["usuario_id"] == 123
assert dados["is_admin"] is False

print("\nToken válido.")

assert verificar_token("token-falso") is None

print("Token inválido rejeitado corretamente.")
