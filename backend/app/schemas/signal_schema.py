from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SignalIn(BaseModel):
	component_id: str
	timestamp: float
	error_message: str

class SignalOut(SignalIn):
	id: Optional[str]
