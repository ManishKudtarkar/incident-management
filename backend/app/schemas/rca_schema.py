from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RCAIn(BaseModel):
	root_cause: str
	fix_applied: str
	prevention_steps: str
	end_time: datetime

class RCAOut(RCAIn):
	id: str
	incident_id: str
