from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.incident import Base
import datetime


class RCA(Base):
    __tablename__ = "rcas"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False, index=True)
    root_cause = Column(String, nullable=False)
    fix_applied = Column(String, nullable=False)
    prevention_steps = Column(String, nullable=False)
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", backref="rcas")
