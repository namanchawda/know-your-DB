from fastapi import APIRouter, HTTPException

from app.services.schema_service import schema_service

router = APIRouter(prefix="/schema", tags=["schema"])


@router.get("/tables")
def get_tables(connectionId: str):
    try:
        return schema_service.get_tables(connectionId)
    except KeyError:
        raise HTTPException(status_code=400, detail="Connection not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/columns")
def get_columns(connectionId: str, table: str):
    try:
        return schema_service.get_columns(connectionId, table)
    except KeyError:
        raise HTTPException(status_code=400, detail="Connection not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
