"""
Port of llm/llm.factory.ts + llm/llm.service.ts combined.

Provider selection:
  local -> Ollama
  cloud -> OpenRouter
  auto  -> Groq first, falls back to Ollama on failure (same as original)
"""
from app.llm.base import GenerateSQLInput, GenerateSQLOutput
from app.llm.groq_provider import GroqProvider
from app.llm.ollama_provider import OllamaProvider
from app.llm.openrouter_provider import OpenRouterProvider

groq = GroqProvider()
ollama = OllamaProvider()
openrouter = OpenRouterProvider()


async def generate_sql_for_mode(mode: str, input: GenerateSQLInput) -> GenerateSQLOutput:
    if mode == "local":
        return await ollama.generate_sql(input)
    if mode == "cloud":
        return await openrouter.generate_sql(input)
    # auto
    try:
        return await groq.generate_sql(input)
    except Exception:
        return await ollama.generate_sql(input)
