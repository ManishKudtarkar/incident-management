from pydantic import BaseModel
from typing import Optional
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
    end_time: datetime


class RCAOut(RCAIn):
    id: str
    incident_id: str
