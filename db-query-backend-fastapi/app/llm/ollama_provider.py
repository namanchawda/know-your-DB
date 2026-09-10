"""Port of llm/ollama.provider.ts"""
import httpx

from app.config import get_settings
from app.llm.base import LLMProvider, GenerateSQLInput, GenerateSQLOutput
from app.llm.prompt_builder import build_nl_to_sql_prompt

settings = get_settings()


class OllamaProvider(LLMProvider):
    async def generate_sql(self, input: GenerateSQLInput) -> GenerateSQLOutput:
        prompt = build_nl_to_sql_prompt(input.db_type, input.schema, input.question)

        async with httpx.AsyncClient(timeout=settings.llm_timeout_ms / 1000) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 48,
                        "temperature": 0,
                        "top_p": 0.9,
                        "repeat_penalty": 1.1,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()

        raw = data.get("response", "")
        return GenerateSQLOutput(sql=raw.strip(), raw=raw, provider="ollama")
