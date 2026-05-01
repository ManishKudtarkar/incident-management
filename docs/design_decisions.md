# Design Decisions

- **Async processing**: Signal ingestion and background processing are async so the API can respond quickly while workers handle persistence.
- **State Pattern**: Incident lifecycle transitions follow `OPEN -> INVESTIGATING -> RESOLVED -> CLOSED`.
- **Strategy Pattern**: Alerting logic is pluggable by severity (`P0` critical, `P2` warning).
- **Multi-DB architecture**: Raw signals live in MongoDB, incident/RCA records live in PostgreSQL, and Redis supports fast cache/debounce/rate-limit data.
- **RCA enforcement**: The backend refuses to close an incident unless a complete RCA exists.
- **RCA categories**: `root_cause_category` is stored with the RCA and must be one of the backend-defined categories exposed by `GET /rca/categories`.
- **Two-step resolution**: Submitting RCA marks the incident `RESOLVED`; clicking **Close Incident** calls `/rca/close/{incident_id}` and marks it `CLOSED`.
- **MTTR**: Calculated from incident `start_time` to RCA `end_time`; the UI also previews it while filling the RCA form.
- **Polling-based real-time UI**: The dashboard refreshes `GET /incident/` every 5 seconds. This gives a live demo experience without adding WebSocket infrastructure.
- **Backpressure**: The queue layer absorbs spikes between the API and worker.
- **Docker startup compatibility**: The backend entrypoint creates missing tables and applies a lightweight compatibility fix for existing local databases that are missing `rcas.root_cause_category`.

## Migration Note

This demo does not use Alembic yet. For the current local Docker setup, `entrypoint.sh` runs:

```sql
ALTER TABLE rcas
ADD COLUMN IF NOT EXISTS root_cause_category VARCHAR NOT NULL DEFAULT 'Unknown';
```

That keeps existing local volumes working after the RCA category field was added. A production deployment should replace this with versioned Alembic migrations.
