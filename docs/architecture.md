# IMS Architecture

## Overview

The Incident Management System (IMS) is designed for high-throughput async signal ingestion, incident grouping, and lifecycle management with RCA enforcement.

## Layers

- **Ingestion**: FastAPI endpoint `/signal/` receives failure signals.
- **Queue**: In-memory `asyncio.Queue` buffers signals between the API and worker.
- **Worker**: Debounces signals by component and creates incidents.
- **Storage**: MongoDB stores raw signals, PostgreSQL stores incidents and RCAs, Redis supports cache/debounce/rate-limit data.
- **Frontend**: React dashboard for live incident triage, RCA submission, and final close.
- **Real-time updates**: The dashboard polls `GET /incident/` every 5 seconds while live mode is enabled.

## Incident Lifecycle

1. `OPEN`: created when a failure signal becomes a new incident.
2. `INVESTIGATING`: responder starts work from the incident detail page.
3. `RESOLVED`: submitting a complete RCA marks the incident resolved.
4. `CLOSED`: clicking **Close Incident** calls `/rca/close/{incident_id}` after RCA validation.

## RCA Data

An RCA includes:

- `root_cause_category`
- `root_cause`
- `fix_applied`
- `prevention_steps`
- `end_time`

The frontend gets valid categories from `GET /rca/categories`, submits the RCA with `POST /rca/{incident_id}`, then closes the incident with `POST /rca/close/{incident_id}`.

## Data Flow

1. Signal -> API -> Queue
2. Worker -> Debounce -> Incident
3. Store raw signals in MongoDB and incident/RCA state in PostgreSQL
4. UI fetches incident and signal details from the backend
5. RCA submit updates the incident to `RESOLVED`
6. RCA close validates the RCA and updates the incident to `CLOSED`

## Real-Time Model

The current implementation uses polling-based real-time updates:

- Dashboard auto-refreshes incidents every 5 seconds.
- Users can pause live refresh with the **Live On / Live Off** control.
- The **Refresh** button remains available for manual reloads.

This keeps the local Docker deployment simple. A production version can replace polling with WebSockets or Server-Sent Events without changing the incident lifecycle model.

## Startup

Docker Compose starts PostgreSQL, MongoDB, Redis, MinIO, the FastAPI backend, and the nginx-served React frontend. The backend entrypoint creates missing tables and applies the lightweight compatibility fix that adds `rcas.root_cause_category` for existing local databases.
