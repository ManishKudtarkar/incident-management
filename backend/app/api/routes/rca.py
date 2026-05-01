from fastapi import APIRouter, HTTPException
from app.schemas.rca_schema import RCAIn, RCAOut
from app.db.postgres import SessionLocal
from app.models.rca import RCA
from app.models.incident import Incident, Status
from sqlalchemy.future import select
import uuid

router = APIRouter(prefix="/rca", tags=["RCA"])

@router.post("/{incident_id}", response_model=RCAOut)
async def submit_rca(incident_id: str, rca: RCAIn):
	async with SessionLocal() as session:
		# Check incident exists
		result = await session.execute(select(Incident).where(Incident.id == incident_id))
		incident = result.scalar_one_or_none()
		if not incident:
			raise HTTPException(status_code=404, detail="Incident not found")
		# Save RCA
		rca_id = str(uuid.uuid4())
		rca_obj = RCA(
			id=rca_id,
			incident_id=incident_id,
			root_cause=rca.root_cause,
			fix_applied=rca.fix_applied,
			prevention_steps=rca.prevention_steps,
			end_time=rca.end_time
		)
		session.add(rca_obj)
		# Update incident status to RESOLVED
		incident.status = Status.RESOLVED
		incident.end_time = rca.end_time
		await session.commit()
		return RCAOut(
			id=rca_id,
			incident_id=incident_id,
			root_cause=rca.root_cause,
			fix_applied=rca.fix_applied,
			prevention_steps=rca.prevention_steps,
			end_time=rca.end_time
		)

# Validation: Prevent closure without RCA
@router.post("/close/{incident_id}")
async def close_incident(incident_id: str):
	async with SessionLocal() as session:
		# Check incident exists
		result = await session.execute(select(Incident).where(Incident.id == incident_id))
		incident = result.scalar_one_or_none()
		if not incident:
			raise HTTPException(status_code=404, detail="Incident not found")
		# Check RCA exists
		rca_result = await session.execute(select(RCA).where(RCA.incident_id == incident_id))
		rca = rca_result.scalar_one_or_none()
		if not rca:
			raise HTTPException(status_code=400, detail="Cannot close incident without RCA")
		# Close incident
		incident.status = Status.CLOSED
		await session.commit()
		return {"status": "closed"}
