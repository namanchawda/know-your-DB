import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = int(os.getenv("PORT", 3000))

    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "gemma2-9b-it")

    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    openrouter_model: str = os.getenv(
        "OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct"
    )

    sql_default_limit: int = int(os.getenv("SQL_DEFAULT_LIMIT", 50))
    llm_timeout_ms: int = int(os.getenv("LLM_TIMEOUT_MS", 8000))

    connect_timeout_s: int = 10  # matches the 10_000ms timeout in ConnectionManagerService

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
