from fastapi import APIRouter, HTTPException

from app.models.dto import ExecuteQueryDto, QueryResult
from app.services.query_service import query_service

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/execute", response_model=QueryResult)
def execute(connectionId: str, dto: ExecuteQueryDto):
    try:
        rows = query_service.execute(connectionId, dto.query)
    except KeyError:
        raise HTTPException(status_code=400, detail="Connection not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return QueryResult(rows=rows, count=len(rows))
