# Backpressure Handling

Backpressure keeps signal ingestion responsive when downstream work is slower than incoming traffic.

## Current Demo Setup

- **Rate limiting**: `POST /signal/` applies a request limit before accepting work.
- **Queue layer**: Accepted signals are pushed into an in-memory `asyncio.Queue`.
- **Async worker**: `DebounceWorker` consumes signals from the queue, groups them by component, writes raw signals to MongoDB, and creates/updates incidents in PostgreSQL.
- **Fast response path**: The API returns after enqueueing the signal, so callers are not blocked by database writes.
- **Metrics**: The backend logs signals/sec and queue size for basic observability.

## Failure Behavior

- If traffic exceeds the configured rate limit, the API returns `429 Too Many Requests`.
- If databases slow down, queued signals wait for the worker instead of blocking request handlers.
- If a write fails transiently, the worker retry/backoff behavior protects the main ingestion path.

## Production Upgrade Path

The demo uses `asyncio.Queue` because it keeps Docker Compose simple. A production deployment would usually replace it with Kafka, Redis Streams, RabbitMQ, or another durable broker so queued signals survive process restarts.
