import logging

from fastapi import APIRouter, HTTPException

from app.models.dto import NLQueryRequest, NLQueryResponse
from app.services.nl_service import nl_service

router = APIRouter(prefix="/nl", tags=["nl"])
logger = logging.getLogger(__name__)


@router.post("/query", response_model=NLQueryResponse)
async def nl_query(connectionId: str, body: NLQueryRequest):
    try:
        result = await nl_service.run(
            connection_id=connectionId,
            question=body.question,
            db_type=body.db_type,
            mode=body.mode,
        )
    except KeyError:
        raise HTTPException(status_code=400, detail="Connection not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("NL query failed")
        raise HTTPException(status_code=502, detail=f"LLM/query error: {e}")
    return NLQueryResponse(**result)
