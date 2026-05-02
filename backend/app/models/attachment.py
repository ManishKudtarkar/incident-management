import uuid
import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.models.incident import Base


class Attachment(Base):
    __tablename__ = "attachments"

    # Use String to match incidents.id type
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False, index=True)
    rca_id = Column(String, ForeignKey("rcas.id"), nullable=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="attachments")
    rca = relationship("RCA", back_populates="attachments")
