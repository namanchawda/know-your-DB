"""Port of llm/openrouter.provider.ts"""
import httpx

from app.config import get_settings
from app.llm.base import LLMProvider, GenerateSQLInput, GenerateSQLOutput
from app.llm.prompt_builder import build_nl_to_sql_prompt

settings = get_settings()


class OpenRouterProvider(LLMProvider):
    async def generate_sql(self, input: GenerateSQLInput) -> GenerateSQLOutput:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")

        prompt = build_nl_to_sql_prompt(input.db_type, input.schema, input.question)

        async with httpx.AsyncClient(timeout=settings.llm_timeout_ms / 1000) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                json={
                    "model": settings.openrouter_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You generate SQL queries only. No explanations.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()

        raw = data["choices"][0]["message"]["content"]
        return GenerateSQLOutput(sql=raw.strip(), raw=raw, provider="openrouter")
