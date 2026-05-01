from app.db.postgres import SessionLocal
from app.models.incident import Incident, Severity, Status
from app.schemas.incident_schema import IncidentCreate
import uuid
import datetime

async def create_incident(component_id, severity):
	incident_id = str(uuid.uuid4())
	async with SessionLocal() as session:
		incident = Incident(
			id=incident_id,
			component_id=component_id,
			severity=severity,
			status=Status.OPEN,
			start_time=datetime.datetime.utcnow()
		)
		session.add(incident)
		await session.commit()
		return incident_id
