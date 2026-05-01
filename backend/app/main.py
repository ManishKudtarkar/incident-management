import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import signal, incident, rca, health, scan, attachment
from app.api.routes.health import metrics, log_metrics
from app.core.queue import signal_queue
from app.db.postgres import engine
from app.models.incident import Base as IncidentBase  # noqa: F401 – needed for metadata
from app.models.rca import RCA  # noqa: F401 – ensures RCA table is registered
from app.models.attachment import Attachment # noqa: F401
from app.workers.consumer import DebounceWorker

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Mission-Critical Incident Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(signal.router)
app.include_router(incident.router)
app.include_router(rca.router)
app.include_router(health.router)
app.include_router(scan.router)
app.include_router(attachment.router)


# ---------------------------------------------------------------------------
# Lifecycle events
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event() -> None:
    loop = asyncio.get_event_loop()
    # Start metrics logger background task
    loop.create_task(log_metrics(signal_queue))
    # Start debounce worker background task
    worker = DebounceWorker(signal_queue, metrics)
    loop.create_task(worker.run())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await engine.dispose()


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Incident Management System API", "docs": "/docs"}
