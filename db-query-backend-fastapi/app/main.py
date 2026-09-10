import asyncio
import contextlib
import logging

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import connections, schema, query, nl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


async def _ollama_keepalive():
    """Port of the setInterval() in the original main.ts: pings Ollama
    every 2 minutes so the local model stays warm."""
    async with httpx.AsyncClient(timeout=5) as client:
        while True:
            await asyncio.sleep(120)
            try:
                await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": settings.ollama_model, "prompt": "ping", "stream": False},
                )
            except Exception:
                pass  # best-effort, same as the original — no error handling there either


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_ollama_keepalive())
    yield
    task.cancel()


app = FastAPI(title="db-query-backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "https://know-your-db.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(connections.router)
app.include_router(schema.router)
app.include_router(query.router)
app.include_router(nl.router)


@app.get("/")
def root():
    return "Hello World!"
