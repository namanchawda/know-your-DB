"""Port of nl/prompt.builder.ts — identical prompt text, used by all three providers."""
from app.models.dto import TableSchema


def build_nl_to_sql_prompt(db_type: str, schema: list[TableSchema], question: str) -> str:
    schema_text = "\n".join(f"{t.name}: {', '.join(t.columns)}" for t in schema)
    return f"""Generate ONE {db_type} SQL SELECT query.

Schema:
{schema_text}

Rules:
- Use only listed tables & columns
- No explanations
- Return SQL only

Question:
{question}"""
