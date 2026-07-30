from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth, projects, scripts, casting, assets, crew, locations, music, costumes, budgets


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Movie Agent API",
    description="AI-powered platform for film pre-production",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(scripts.router)
app.include_router(casting.router)
app.include_router(assets.router)
app.include_router(crew.router)
app.include_router(locations.router)
app.include_router(music.router)
app.include_router(costumes.router)
app.include_router(budgets.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
