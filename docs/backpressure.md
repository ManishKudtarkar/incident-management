# Backpressure Handling

- **Queue Layer**: All signals are pushed to a queue (Kafka/Redis Streams or in-memory for demo).
- **Async Workers**: Workers consume from queue at their own pace.
- **Rate Limiting**: API applies rate limits to avoid overload.
- **Metrics**: System logs signals/sec and queue lag for observability.
