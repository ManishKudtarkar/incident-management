from fastapi import APIRouter, HTTPException
from app.schemas.rca_schema import RCAIn, RCAOut, ROOT_CAUSE_CATEGORIES
from app.db.postgres import SessionLocal
from app.models.rca import RCA
from app.models.incident import Incident, Status
from sqlalchemy.future import select
import uuid

router = APIRouter(prefix="/rca", tags=["RCA"])


@router.get("/categories")
async def get_rca_categories():
    """Return the list of valid root cause categories for the RCA form dropdown."""
    return {"categories": ROOT_CAUSE_CATEGORIES}


@router.post("/{incident_id}", response_model=RCAOut)
async def submit_rca(incident_id: str, rca: RCAIn):
    async with SessionLocal() as session:
        result = await session.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        # Validate category
        if rca.root_cause_category not in ROOT_CAUSE_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {ROOT_CAUSE_CATEGORIES}",
            )

        rca_id = str(uuid.uuid4())
        rca_obj = RCA(
            id=rca_id,
            incident_id=incident_id,
            root_cause=rca.root_cause,
            root_cause_category=rca.root_cause_category,
            fix_applied=rca.fix_applied,
            prevention_steps=rca.prevention_steps,
            end_time=rca.end_time,
        )
        session.add(rca_obj)
        incident.status = Status.RESOLVED
        incident.end_time = rca.end_time
        await session.commit()

        return RCAOut(
            id=rca_id,
            incident_id=incident_id,
            root_cause=rca.root_cause,
            root_cause_category=rca.root_cause_category,
            fix_applied=rca.fix_applied,
            prevention_steps=rca.prevention_steps,
            end_time=rca.end_time,
        )


@router.post("/close/{incident_id}")
async def close_incident(incident_id: str):
    """Close an incident. Requires a complete RCA (all fields filled)."""
    async with SessionLocal() as session:
        result = await session.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        rca_result = await session.execute(select(RCA).where(RCA.incident_id == incident_id))
        rca = rca_result.scalar_one_or_none()

        # Strict validation — all fields must be present and non-empty
        if not rca:
            raise HTTPException(status_code=400, detail="Cannot close incident: RCA is missing")
        if not rca.root_cause or not rca.fix_applied or not rca.prevention_steps:
            raise HTTPException(
                status_code=400,
                detail="Cannot close incident: RCA is incomplete (root_cause, fix_applied, prevention_steps all required)",
            )

        incident.status = Status.CLOSED
        await session.commit()
        return {"status": "closed", "incident_id": incident_id}
