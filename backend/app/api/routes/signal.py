from fastapi import APIRouter, HTTPException, status
from app.schemas.signal_schema import SignalIn
from app.services.ingestion_service import ingest_signal

router = APIRouter(prefix="/signal", tags=["Signal"])


@router.post("/", status_code=status.HTTP_202_ACCEPTED)
async def ingest_signal_endpoint(signal: SignalIn):
    """
    Ingest a failure signal.  Returns 202 Accepted when queued,
    429 Too Many Requests when the rate limit is exceeded.
    """
    ok, message = await ingest_signal(signal.dict())
    if not ok:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=message)
    return {"status": message}
