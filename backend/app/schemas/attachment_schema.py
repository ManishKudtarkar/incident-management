import uuid
from pydantic import BaseModel
import datetime

class AttachmentBase(BaseModel):
    file_name: str
    file_type: str

class AttachmentCreate(AttachmentBase):
    incident_id: uuid.UUID
    file_path: str

class Attachment(AttachmentBase):
    id: uuid.UUID
    rca_id: uuid.UUID | None = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True
