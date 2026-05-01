# Prompts, Spec & Plans

This document contains the prompts, specifications, and plans used to build this repository, as required by the submission guidelines.

---

## Assignment Interpretation

The assignment required building a Mission-Critical Incident Management System with:

- High-throughput signal ingestion
- Debouncing, where many repeated signals become one incident per component per time window
- Multi-database architecture with PostgreSQL, MongoDB, and Redis
- State Pattern for incident lifecycle
- Strategy Pattern for alerting
- Mandatory RCA before closure
- RCA root cause category selection
- MTTR calculation
- React dashboard with live feed, incident detail, RCA form, and close action

---

## Architecture Decisions Made

### Why asyncio.Queue instead of Kafka?

The assignment hints at Kafka, but for a self-contained Docker Compose setup, `asyncio.Queue` provides similar backpressure semantics without requiring a Kafka broker. The API returns quickly after enqueueing work, and the worker processes signals asynchronously. Kafka remains the production upgrade path.

### Why PostgreSQL for incidents, MongoDB for signals?

- Incidents and RCAs have relationships, require transactional updates, and have a fixed schema, so PostgreSQL is the right fit.
- Signals arrive quickly, are write-heavy, and can have flexible shape, so MongoDB is the right fit.
- Redis is used for debounce TTL keys, active incident cache, and rate-limit support.

### Why gunicorn + uvicorn workers?

Gunicorn manages multiple worker processes, and Uvicorn handles async FastAPI requests inside each worker. The `entrypoint.sh` runs database initialization before starting Gunicorn.

### Why a lightweight startup compatibility fix?

This project currently does not use Alembic migrations. To keep existing local Docker volumes working after `root_cause_category` was added to RCAs, `entrypoint.sh` applies:

```sql
ALTER TABLE rcas
ADD COLUMN IF NOT EXISTS root_cause_category VARCHAR NOT NULL DEFAULT 'Unknown';
```

In production, this should become a versioned Alembic migration.

---

## Key Prompts Used

### Initial Setup

```text
check all files and readme and run the project and build configuration production level
```

### Bug Fixes

```text
aioredis 2.0.1 is incompatible with Python 3.11 - TypeError: duplicate base class TimeoutError
motor 3.4.0 incompatible with pymongo 4.17.0 - ImportError: cannot import name '_QUERY_OPTIONS'
Gunicorn multi-worker race on CREATE TYPE - duplicate key value violates unique constraint
RCA submit returns HTTP 500 because root_cause_category is missing from existing rcas table
```

### Frontend Improvements

```text
make the frontend better and it should be more understandable
so its resolved now how cn it be closed
```

### URL Scanner Feature

```text
how it can be when i put an url in my frontend the backend fetches and all scans will be passed
```

### Website Crawler Feature

```text
see as a user what should be needed add it crawl the full website
```

### Dynamic Incident Summary

```text
its look like so hardcoded [referring to the static P0 banner text]
```

### README and Docs

```text
make the readme best with mermaid diagram and every best to let me understand as junior dev
check all md file and update it
```

---

## Design Pattern Implementation

### State Pattern

```text
backend/app/patterns/state/
├── base_state.py
├── open_state.py
├── investigating_state.py
├── resolved_state.py
└── closed_state.py
```

Lifecycle:

```text
OPEN -> INVESTIGATING -> RESOLVED -> CLOSED
```

### Strategy Pattern

```text
backend/app/patterns/strategy/
├── alert_strategy.py
├── p0_alert.py
└── p2_alert.py
```

`P0AlertStrategy` handles critical incidents, while `P2AlertStrategy` handles warning incidents.

---

## Backpressure Handling

See `docs/backpressure.md` for full details.

Summary:

1. Rate limiter on `POST /signal/` rejects excess traffic.
2. `asyncio.Queue` buffers signals between the API and worker.
3. Worker processes signals asynchronously, so the API does not block on DB writes.
4. If DB writes slow down, signals wait in the queue.
5. `DebounceWorker` owns grouping and persistence work.

---

## RCA and Closure Flow

1. Responder opens an incident and moves it from `OPEN` to `INVESTIGATING`.
2. Responder submits RCA using `POST /rca/{incident_id}`.
3. RCA payload includes `root_cause_category`, `root_cause`, `fix_applied`, `prevention_steps`, and `end_time`.
4. Backend validates the category against `GET /rca/categories`, saves the RCA, and marks the incident `RESOLVED`.
5. Frontend shows **Close Incident** for resolved incidents.
6. Clicking it calls `POST /rca/close/{incident_id}`.
7. Backend validates that a complete RCA exists and marks the incident `CLOSED`.

---

## Bonus Features Added

1. **URL Scanner** - `POST /scan/` fetches any URL and runs health checks.
2. **Full Website Crawler** - `POST /scan/crawl` performs BFS link discovery and concurrent scanning.
3. **Scan History** - MongoDB stores scan and crawl results.
4. **Dynamic incident summary** - banner text is derived from actual signal data.
5. **Live MTTR preview** - RCA form shows calculated MTTR as dates are edited.
6. **RCA category dropdown** - backend categories are exposed through `/rca/categories`.
7. **Resolved-to-closed UI action** - resolved incidents show a **Close Incident** button.
8. **Signal simulator** - `scripts/simulate_signals.py` sends realistic test signals.
9. **Production Docker setup** - multi-stage builds, non-root user, and health checks.
