# Prompts, Spec & Plans

This document contains all the prompts, specifications, and plans used to build this repository,
as required by the submission guidelines.

---

## Assignment Interpretation

The assignment required building a Mission-Critical Incident Management System with:
- High-throughput signal ingestion (10,000+ signals/sec)
- Debouncing (100 signals → 1 incident per component per 10s window)
- Multi-database architecture (PostgreSQL + MongoDB + Redis)
- State Pattern for incident lifecycle
- Strategy Pattern for alerting
- Mandatory RCA before closure
- MTTR calculation
- React dashboard with live feed, incident detail, RCA form

---

## Architecture Decisions Made

### Why asyncio.Queue instead of Kafka?
The assignment hints at Kafka but for a self-contained Docker Compose setup, `asyncio.Queue`
provides the same backpressure semantics without requiring a Kafka broker. The queue is
bounded in memory and the API returns 202 immediately — the worker processes asynchronously.
Kafka would be the production upgrade path.

### Why PostgreSQL for incidents, MongoDB for signals?
- Incidents and RCAs have relationships (foreign keys), require transactional updates (status
  transitions must be atomic), and have a fixed schema → PostgreSQL is correct.
- Signals arrive at 1000+/sec with no fixed schema, are write-heavy, and are queried by
  component_id → MongoDB is correct.
- Redis for debounce TTL keys (auto-expire after 10s) and active incident cache.

### Why gunicorn + uvicorn workers?
4 worker processes handle concurrent requests. The `entrypoint.sh` runs DB table creation
once before forking workers to avoid the `duplicate key` race condition on `CREATE TYPE`.

---

## Key Prompts Used (Kiro AI)

### Initial Setup
```
check all files and readme and run the project and build configuration production level
```

### Bug Fixes
```
aioredis 2.0.1 is incompatible with Python 3.11 — TypeError: duplicate base class TimeoutError
motor 3.4.0 incompatible with pymongo 4.17.0 — ImportError: cannot import name '_QUERY_OPTIONS'
Gunicorn multi-worker race on CREATE TYPE — duplicate key value violates unique constraint
```

### Frontend Improvements
```
make the frontend better and it should be more understandable
```

### URL Scanner Feature
```
how it can be when i put an url in my frontend the backend fetches and all scans will be passed
```

### Website Crawler Feature
```
see as a user what should be needed add it crawl the full website
```

### Dynamic Incident Summary
```
its look like so hardcoded [referring to the static P0 banner text]
```

### README
```
make the readme best with mermaid diagram and every best to let me understand as junior dev
```

---

## Design Pattern Implementation

### State Pattern
```
backend/app/patterns/state/
├── base_state.py       # Abstract IncidentState with next()/prev()
├── open_state.py       # OPEN → next() = InvestigatingState
├── investigating_state.py  # INVESTIGATING → next() = ResolvedState
├── resolved_state.py   # RESOLVED → next() = ClosedState
└── closed_state.py     # CLOSED → terminal state
```
Circular imports resolved using `from __future__ import annotations` + lazy imports.

### Strategy Pattern
```
backend/app/patterns/strategy/
├── alert_strategy.py   # Abstract AlertStrategy with alert(incident)
├── p0_alert.py         # P0AlertStrategy — critical, pages on-call
└── p2_alert.py         # P2AlertStrategy — warning, Slack notification
```

---

## Backpressure Handling

See `docs/backpressure.md` for full details.

Summary:
1. Rate limiter on `POST /signal/` — 1000 req/sec max, returns 429 if exceeded
2. `asyncio.Queue` buffers signals between API and worker
3. Worker processes signals asynchronously — API never blocks on DB writes
4. If DB is slow, signals queue up in memory; API stays responsive
5. `DebounceWorker` has retry logic with exponential backoff for DB writes

---

## Bonus Features Added

1. **URL Scanner** — `POST /scan/` — fetches any URL and runs 7 health checks
2. **Full Website Crawler** — `POST /scan/crawl` — BFS link discovery + concurrent scanning
3. **Scan History** — MongoDB stores all scan/crawl results
4. **Dynamic incident summary** — banner text derived from actual signal data
5. **Live MTTR preview** — RCA form shows calculated MTTR as you fill in the dates
6. **Signal simulator** — `scripts/simulate_signals.py` with realistic component names
7. **Production Docker setup** — multi-stage builds, non-root user, health checks
