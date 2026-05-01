from pydantic import BaseModel
from typing import Optional


class SignalDocument(BaseModel):
    """MongoDB signal document schema (not SQLAlchemy — stored in Mongo)."""
    component_id: str
    timestamp: float
    error_message: str
    incident_id: Optional[str] = None
