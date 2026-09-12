"""
Port of connections/connection-manager.service.ts.

Same in-memory map design as the original (fine for a single-instance
dev/demo backend; if you ever run multiple backend replicas behind a
load balancer, this map needs to move to something shared like Redis,
since a user's connection would only "exist" on whichever pod created it).
"""
import uuid
import logging
from dataclasses import dataclass
from typing import Literal, Optional
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from pymongo import MongoClient
from pymongo.database import Database

from app.config import get_settings
from app.models.dto import CreateConnectionDto

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class SqlConnection:
    kind: Literal["sql"]
    engine: Engine
    db_type: str


@dataclass
class MongoConnection:
    kind: Literal["mongo"]
    client: MongoClient
    db: Database
    db_type: str = "mongodb"


ManagedConnection = SqlConnection | MongoConnection


class ConnectionManagerService:
    def __init__(self) -> None:
        self._connections: dict[str, ManagedConnection] = {}

    def create_connection(self, dto: CreateConnectionDto) -> str:
        logger.info("Creating %s connection to host=%s", dto.db_type, dto.host)
        connection_id = str(uuid.uuid4())

        if dto.db_type == "postgres":
            url = (
                f"postgresql+psycopg2://{quote_plus(dto.username or '')}:"
                f"{quote_plus(dto.password or '')}@{dto.host}:{dto.port or 5432}"
                f"/{dto.database}"
            )
            connect_args = {"connect_timeout": settings.connect_timeout_s}
            if dto.ssl:
                # mirrors the original's `rejectUnauthorized: false`
                connect_args["sslmode"] = "require"
            engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
            self._connections[connection_id] = SqlConnection("sql", engine, "postgres")

        elif dto.db_type == "mysql":
            url = (
                f"mysql+pymysql://{quote_plus(dto.username or '')}:"
                f"{quote_plus(dto.password or '')}@{dto.host}:{dto.port or 3306}"
                f"/{dto.database}"
            )
            engine = create_engine(
                url,
                connect_args={"connect_timeout": settings.connect_timeout_s},
                pool_pre_ping=True,
            )
            self._connections[connection_id] = SqlConnection("sql", engine, "mysql")

        elif dto.db_type == "oracle":
            url = (
                f"oracle+oracledb://{quote_plus(dto.username or '')}:"
                f"{quote_plus(dto.password or '')}@{dto.host}:{dto.port or 1521}"
                f"/?service_name={dto.service_name}"
            )
            engine = create_engine(url, pool_pre_ping=True)
            self._connections[connection_id] = SqlConnection("sql", engine, "oracle")

        elif dto.db_type == "mongodb":
            if not dto.mongo_uri:
                raise ValueError("mongoUri is required for mongodb connections")
            client = MongoClient(
                dto.mongo_uri, connectTimeoutMS=settings.connect_timeout_s * 1000
            )
            db = client[dto.database] if dto.database else client.get_default_database()
            self._connections[connection_id] = MongoConnection("mongo", client, db)

        else:
            raise ValueError(f"Unsupported dbType: {dto.db_type}")

        return connection_id

    def get(self, connection_id: str) -> ManagedConnection:
        conn = self._connections.get(connection_id)
        if conn is None:
            raise KeyError(f"No connection found for id {connection_id}")
        return conn

    def close(self, connection_id: str) -> None:
        conn = self._connections.pop(connection_id, None)
        if conn is None:
            return
        if conn.kind == "sql":
            conn.engine.dispose()
        else:
            conn.client.close()


# Module-level singleton, mirroring Nest's default singleton-scoped provider.
connection_manager = ConnectionManagerService()
