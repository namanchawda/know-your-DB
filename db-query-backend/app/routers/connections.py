from fastapi import APIRouter, HTTPException

from app.models.dto import CreateConnectionDto, ConnectResponse
from app.services.connection_manager import connection_manager

router = APIRouter(prefix="/connections", tags=["connections"])


@router.post("/connect", response_model=ConnectResponse)
def connect(dto: CreateConnectionDto):
    try:
        connection_id = connection_manager.create_connection(dto)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ConnectResponse(connection_id=connection_id)
