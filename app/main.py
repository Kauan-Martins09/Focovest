from fastapi import FastAPI
from .db import Base, engine
from . import routes
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # libera qualquer front (dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)