import datetime
from pydantic import BaseModel
from typing import Optional


class AttachmentBase(BaseModel):
    file_name: str
    file_type: str


class AttachmentCreate(AttachmentBase):
    incident_id: str
    file_path: str


class AttachmentOut(AttachmentBase):
    id: str
    incident_id: str
    rca_id: Optional[str] = None
    file_path: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True
