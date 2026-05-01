from typing import Optional, Tuple

from sqlalchemy.future import select

from app.db.postgres import SessionLocal
from app.models.incident import Incident, Status
from app.models.rca import RCA
from app.utils.time_utils import calc_mttr


async def validate_and_close_rca(incident_id: str) -> Tuple[bool, Optional[float]]:
    """
    Validate that an RCA exists and is complete, then calculate MTTR.

    Returns:
        (True, mttr_seconds)  – RCA is valid
        (False, None)         – RCA is missing or incomplete
    """
    async with SessionLocal() as session:
        rca_result = await session.execute(
            select(RCA).where(RCA.incident_id == incident_id)
        )
        rca = rca_result.scalar_one_or_none()

        if not rca or not (rca.root_cause and rca.fix_applied and rca.prevention_steps):
            return False, None

        incident_result = await session.execute(
            select(Incident).where(Incident.id == incident_id)
        )
        incident = incident_result.scalar_one_or_none()

        if incident and incident.start_time and rca.end_time:
            mttr = calc_mttr(incident.start_time, rca.end_time)
            return True, mttr

        return True, None
