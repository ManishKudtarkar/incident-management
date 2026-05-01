import datetime
import enum

from sqlalchemy import Column, DateTime, Enum, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Severity(enum.Enum):
    P0 = "P0"
    P2 = "P2"


class Status(enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    component_id = Column(String, index=True, nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    status = Column(Enum(Status), nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
