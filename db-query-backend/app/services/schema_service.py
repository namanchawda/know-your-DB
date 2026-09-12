"""Port of schema/schema.service.ts"""
from sqlalchemy import text

from app.models.dto import TableSchema
from app.services.connection_manager import connection_manager, SqlConnection, MongoConnection


class SchemaService:
    def get_tables(self, connection_id: str) -> list[str]:
        conn = connection_manager.get(connection_id)

        if isinstance(conn, MongoConnection):
            return conn.db.list_collection_names()

        # SQL
        if conn.db_type == "postgres":
            query = text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' "
                "AND table_type = 'BASE TABLE' "
                "ORDER BY table_name"
            )
        elif conn.db_type == "mysql":
            query = text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = DATABASE() "
                "AND table_type = 'BASE TABLE' "
                "ORDER BY table_name"
            )
        else:
            raise ValueError(f"getTables not supported for {conn.db_type}")

        with conn.engine.connect() as c:
            return [row[0] for row in c.execute(query)]

    def get_columns(self, connection_id: str, table: str) -> list[dict]:
        conn = connection_manager.get(connection_id)

        if isinstance(conn, MongoConnection):
            # Same "infer from a sample" approach as the original
            docs = list(conn.db[table].find().limit(10))
            fields: dict[str, set[str]] = {}
            for doc in docs:
                for key, value in doc.items():
                    fields.setdefault(key, set()).add(type(value).__name__)
            return [{"name": k, "type": "/".join(sorted(v))} for k, v in fields.items()]

        if conn.db_type == "postgres":
            query = text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :table "
                "ORDER BY ordinal_position"
            )
        elif conn.db_type == "mysql":
            query = text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = :table "
                "ORDER BY ordinal_position"
            )
        else:
            raise ValueError(f"getColumns not supported for {conn.db_type}")

        with conn.engine.connect() as c:
            return [
                {"column_name": row[0], "data_type": row[1]}
                for row in c.execute(query, {"table": table})
            ]

    def get_full_schema(self, connection_id: str) -> list[TableSchema]:
        """SQL-only, same as the original."""
        conn = connection_manager.get(connection_id)
        if isinstance(conn, MongoConnection):
            raise ValueError("getFullSchema is SQL-only")

        tables = self.get_tables(connection_id)
        result = []
        for table in tables:
            cols = self.get_columns(connection_id, table)
            result.append(TableSchema(name=table, columns=[c["column_name"] for c in cols]))
        return result


schema_service = SchemaService()
