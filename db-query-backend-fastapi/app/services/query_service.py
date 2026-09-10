"""Port of query/query.service.ts"""
import re
from sqlalchemy import text

from app.services.connection_manager import connection_manager, MongoConnection

FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate)\b", re.IGNORECASE
)


class QueryService:
    def execute(self, connection_id: str, query: str) -> list[dict]:
        conn = connection_manager.get(connection_id)

        if isinstance(conn, MongoConnection):
            raise ValueError("MongoDB connections are not supported for /query/execute")

        stripped = query.strip()
        if not stripped.lower().startswith("select"):
            raise ValueError("Only SELECT queries are allowed")
        if FORBIDDEN.search(stripped):
            raise ValueError("Query contains a forbidden keyword")

        with conn.engine.connect() as c:
            result = c.execute(text(stripped))
            columns = result.keys()
            return [dict(zip(columns, row)) for row in result.fetchall()]


query_service = QueryService()
