from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IncidentBase(BaseModel):
	component_id: str
	severity: str
	status: str
	start_time: datetime
	end_time: Optional[datetime] = None

class IncidentCreate(BaseModel):
	component_id: str
	severity: str

class IncidentOut(IncidentBase):
	id: str
