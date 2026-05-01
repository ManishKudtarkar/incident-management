from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from app.db.mongo import get_mongo
from app.db.postgres import SessionLocal
from app.models.incident import Incident, Status
from app.schemas.incident_schema import IncidentOut

router = APIRouter(prefix="/incident", tags=["Incident"])


@router.get("/", response_model=list[IncidentOut])
async def list_incidents():
    """Return all incidents ordered by start_time descending."""
    async with SessionLocal() as session:
        result = await session.execute(
            select(Incident).order_by(Incident.start_time.desc())
        )
        incidents = result.scalars().all()
        return [
            IncidentOut(
                id=i.id,
                component_id=i.component_id,
                severity=i.severity.value,
                status=i.status.value,
                start_time=i.start_time,
                end_time=i.end_time,
            )
            for i in incidents
        ]


@router.get("/{incident_id}")
async def get_incident_detail(incident_id: str):
    """Return incident details plus its raw signals from MongoDB."""
    async with SessionLocal() as session:
        result = await session.execute(
            select(Incident).where(Incident.id == incident_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

    db = await get_mongo()
    signals_cursor = db.signals.find(
        {"component_id": incident.component_id}, {"_id": 0}
    )
    signals = await signals_cursor.to_list(100)

    return {
        "incident": IncidentOut(
            id=incident.id,
            component_id=incident.component_id,
            severity=incident.severity.value,
            status=incident.status.value,
            start_time=incident.start_time,
            end_time=incident.end_time,
        ),
        "signals": signals,
    }


@router.patch("/{incident_id}/status", response_model=IncidentOut)
async def update_incident_status(incident_id: str, new_status: str):
    """
    Transition an incident to a new status.
    Valid transitions: OPEN → INVESTIGATING → RESOLVED → CLOSED
    Closing requires an RCA (enforced by /rca/close/{incident_id}).
    """
    valid_statuses = {s.value for s in Status}
    if new_status.upper() not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    async with SessionLocal() as session:
        result = await session.execute(
            select(Incident).where(Incident.id == incident_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        incident.status = Status[new_status.upper()]
        await session.commit()
        await session.refresh(incident)

        return IncidentOut(
            id=incident.id,
            component_id=incident.component_id,
            severity=incident.severity.value,
            status=incident.status.value,
            start_time=incident.start_time,
            end_time=incident.end_time,
        )
