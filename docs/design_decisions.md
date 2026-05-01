# Design Decisions

- **Async Processing**: All ingestion and processing is async for scale.
- **State Pattern**: Incident lifecycle transitions are enforced (OPEN → INVESTIGATING → RESOLVED → CLOSED).
- **Strategy Pattern**: Alerting logic is pluggable (P0 = critical, P2 = warning).
- **Multi-DB**: Raw signals in MongoDB, transactional data in PostgreSQL, cache in Redis.
- **RCA Enforcement**: Cannot close incident without RCA.
- **MTTR**: Calculated automatically on RCA submission.
- **Backpressure**: Queue layer absorbs spikes.
