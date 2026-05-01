import asyncio
import datetime
import time
import uuid
from collections import defaultdict

from app.utils.logger import get_logger

logger = get_logger("consumer")


class DebounceWorker:
    """
    Reads signals from the in-memory queue, debounces them by component_id
    (10-second window), creates incidents in PostgreSQL, stores raw signals
    in MongoDB, and caches active incidents in Redis.
    """

    DEBOUNCE_WINDOW_SECONDS = 10

    def __init__(self, queue: asyncio.Queue, metrics: dict):
        self.queue = queue
        self.metrics = metrics
        self.last_signal_time: dict[str, float] = defaultdict(float)
        self.incident_map: dict[str, str] = {}   # component_id → incident_id
        self._signals_this_second = 0
        self._last_sec = time.time()

    async def run(self) -> None:
        # Lazy imports to avoid circular dependencies at module load time
        from app.db.mongo import insert_signal
        from app.db.postgres import SessionLocal
        from app.db.redis import cache_active_incident
        from app.models.incident import Incident, Severity, Status

        logger.info("DebounceWorker started")

        while True:
            signal: dict = await self.queue.get()
            now = time.time()

            comp_id: str = signal.get("component_id", "unknown")

            # ── Store raw signal in MongoDB ──────────────────────────────
            try:
                await insert_signal(signal)
            except Exception as exc:
                logger.error("MongoDB insert failed: %s", exc)

            # ── Debounce: reuse existing incident within the window ───────
            within_window = (
                now - self.last_signal_time[comp_id] < self.DEBOUNCE_WINDOW_SECONDS
                and comp_id in self.incident_map
            )

            if within_window:
                incident_id = self.incident_map[comp_id]
            else:
                # Generate a unique ID — UUID avoids collisions across workers
                incident_id = "INC-" + str(uuid.uuid4())[:8].upper()
                self.incident_map[comp_id] = incident_id

                severity = Severity.P0 if "db" in comp_id else Severity.P2
                # Respect severity hint from scan service if present
                hint = signal.get("severity_hint", "")
                if hint == "P0":
                    severity = Severity.P0
                elif hint == "P2":
                    severity = Severity.P2

                try:
                    async with SessionLocal() as session:
                        incident = Incident(
                            id=incident_id,
                            component_id=comp_id,
                            severity=severity,
                            status=Status.OPEN,
                            start_time=datetime.datetime.utcnow(),
                        )
                        session.add(incident)
                        await session.commit()
                    logger.info("Created incident %s for component %s", incident_id, comp_id)
                except Exception as exc:
                    logger.error("PostgreSQL insert failed: %s", exc)

            self.last_signal_time[comp_id] = now

            # ── Cache active incident in Redis ───────────────────────────
            try:
                await cache_active_incident(
                    incident_id,
                    {"component_id": comp_id, "status": "OPEN", "incident_id": incident_id},
                )
            except Exception as exc:
                logger.error("Redis cache failed: %s", exc)

            # ── Update metrics ───────────────────────────────────────────
            self._signals_this_second += 1
            if now - self._last_sec >= 1:
                self.metrics["signals_per_second"] = self._signals_this_second
                self._signals_this_second = 0
                self._last_sec = now

            self.queue.task_done()
