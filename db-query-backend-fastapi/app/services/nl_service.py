"""Port of nl/nl.service.ts"""
import re

from app.config import get_settings
from app.llm.base import GenerateSQLInput
from app.llm.factory import generate_sql_for_mode
from app.models.dto import TableSchema
from app.services.connection_manager import connection_manager, MongoConnection
from app.services.schema_service import schema_service
from app.services.query_service import FORBIDDEN

settings = get_settings()

SQL_BLOCK_RE = re.compile(r"```sql\s*(.*?)```", re.IGNORECASE | re.DOTALL)
CODE_BLOCK_RE = re.compile(r"```\s*(.*?)```", re.DOTALL)


def extract_sql(raw: str) -> str:
    """Same extraction strategy as the original extractSQL(): pull SQL out of
    a fenced code block if the model wrapped it in one, otherwise use the
    raw text as-is."""
    m = SQL_BLOCK_RE.search(raw)
    if m:
        return m.group(1).strip()
    m = CODE_BLOCK_RE.search(raw)
    if m:
        return m.group(1).strip()
    return raw.strip().rstrip(";").strip() + ""


def validate_sql(sql: str) -> None:
    if not sql.lower().startswith("select"):
        raise ValueError("Generated SQL must start with SELECT")
    if FORBIDDEN.search(sql):
        raise ValueError("Generated SQL contains a forbidden keyword")


def validate_columns(sql: str, full_schema: list[TableSchema]) -> None:
    """Best-effort guard: every table name the model referenced must exist
    in the real schema. (Full column-level validation would need a proper
    SQL parser; this keeps parity with what the original service did.)"""
    known_tables = {t.name.lower() for t in full_schema}
    referenced = re.findall(r"\bfrom\s+([a-zA-Z0-9_\.\"]+)|\bjoin\s+([a-zA-Z0-9_\.\"]+)", sql, re.IGNORECASE)
    for a, b in referenced:
        table = (a or b).strip('"').split(".")[-1].lower()
        if table and table not in known_tables:
            raise ValueError(f"Generated SQL references unknown table: {table}")


def add_limit_if_missing(sql: str, default_limit: int) -> str:
    if re.search(r"\blimit\s+\d+", sql, re.IGNORECASE):
        return sql
    return f"{sql.rstrip(';').strip()} LIMIT {default_limit}"


def reduce_schema(full_schema: list[TableSchema], question: str) -> list[TableSchema]:
    """Same heuristic as the original: keep tables whose name literally
    appears in the question text; if none match, send the full schema."""
    q_lower = question.lower()
    matched = [t for t in full_schema if t.name.lower() in q_lower]
    return matched if matched else full_schema


class NLService:
    async def run(self, connection_id: str, question: str, db_type: str, mode: str) -> dict:
        conn = connection_manager.get(connection_id)
        if isinstance(conn, MongoConnection):
            raise ValueError("MongoDB connections are not supported for /nl/query")

        full_schema = schema_service.get_full_schema(connection_id)
        prompt_schema = reduce_schema(full_schema, question)

        llm_input = GenerateSQLInput(db_type=db_type, schema=prompt_schema, question=question)
        result = await generate_sql_for_mode(mode, llm_input)

        sql = extract_sql(result.sql)
        validate_sql(sql)
        validate_columns(sql, full_schema)
        final_sql = add_limit_if_missing(sql, settings.sql_default_limit)

        from sqlalchemy import text
        with conn.engine.connect() as c:
            exec_result = c.execute(text(final_sql))
            columns = exec_result.keys()
            rows = [dict(zip(columns, row)) for row in exec_result.fetchall()]

        return {"sql": final_sql, "rows": rows, "provider": result.provider}


nl_service = NLService()
