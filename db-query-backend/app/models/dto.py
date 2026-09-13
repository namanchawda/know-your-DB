from typing import Literal, Optional
from pydantic import AliasChoices, BaseModel, Field, field_validator

DbType = Literal["postgres", "mysql", "oracle", "mongodb"]
LLMMode = Literal["local", "cloud", "auto"]


class CreateConnectionDto(BaseModel):
    """
    Fixed vs. the NestJS version: the old DTO only allowed postgres/mysql
    even though ConnectionManagerService actually handled oracle + mongodb,
    and the DTO wasn't even wired into the controller. This one matches
    what the service really supports, and it's enforced (FastAPI validates
    request bodies against the Pydantic model automatically).
    """
    db_type: DbType = Field(alias="dbType")
    connection_string: Optional[str] = Field(
        default=None, alias="connectionString"
    )

    # SQL (postgres / mysql / oracle)
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssl: Optional[bool] = None

    # oracle-specific
    service_name: Optional[str] = Field(default=None, alias="serviceName")

    # mongodb
    mongo_uri: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("mongoUri", "uri"),
        serialization_alias="mongoUri",
    )

    class Config:
        populate_by_name = True

    @field_validator("db_type", mode="before")
    @classmethod
    def normalize_db_type(cls, value: str) -> str:
        if not isinstance(value, str):
            return value

        db_type_map = {
            "postgresql": "postgres",
            "postgres": "postgres",
            "mysql": "mysql",
            "oracle": "oracle",
            "mongodb": "mongodb",
        }
        return db_type_map.get(value.lower(), value.lower())


class ConnectResponse(BaseModel):
    connection_id: str = Field(serialization_alias="connectionId")


class ExecuteQueryDto(BaseModel):
    query: str


class QueryResult(BaseModel):
    rows: list
    count: int


class NLQueryRequest(BaseModel):
    question: str
    db_type: str = Field(alias="dbType")
    mode: LLMMode = "auto"

    class Config:
        populate_by_name = True


class TableSchema(BaseModel):
    name: str
    columns: list[str]


class GenerateSQLOutput(BaseModel):
    sql: str
    raw: Optional[str] = None
    provider: Literal["ollama", "groq", "openrouter"]


class NLQueryResponse(BaseModel):
    sql: str
    rows: list
    provider: str
