from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


ROOT_CAUSE_CATEGORIES = [
    "Infrastructure Failure",
    "Database / RDBMS Issue",
    "Cache Failure",
    "Network / DNS Issue",
    "Application Bug",
    "Deployment / Config Change",
    "Third-party / External Service",
    "Security Incident",
    "Capacity / Scaling Issue",
    "Unknown",
]


class RCAIn(BaseModel):
    root_cause: str
    root_cause_category: str = "Unknown"
    fix_applied: str
    prevention_steps: str
    end_time: Optional[datetime] = None
    attachment_ids: List[str] = []


class RCAOut(BaseModel):
    id: str
    incident_id: str
    root_cause: str
    root_cause_category: str
    fix_applied: str
    prevention_steps: str
    end_time: Optional[datetime] = None
