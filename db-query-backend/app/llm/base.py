from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models.dto import TableSchema


@dataclass
class GenerateSQLInput:
    db_type: str
    schema: list[TableSchema]
    question: str


@dataclass
class GenerateSQLOutput:
    sql: str
    raw: str | None
    provider: str


class LLMProvider(ABC):
    @abstractmethod
    async def generate_sql(self, input: GenerateSQLInput) -> GenerateSQLOutput: ...
