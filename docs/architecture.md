# IMS Architecture

## Overview

The Incident Management System (IMS) is designed for high-throughput, async signal ingestion, incident grouping, and lifecycle management with RCA enforcement.

## Layers
- **Ingestion**: FastAPI endpoint `/signal` receives signals
- **Queue**: Async queue (Kafka/Redis Streams or in-memory)
- **Worker**: Debounces and groups signals, creates incidents
- **Storage**: MongoDB (signals), PostgreSQL (incidents/RCA), Redis (cache)
- **Frontend**: React dashboard

## Data Flow
1. Signal → API → Queue
2. Worker → Debounce → Incident
3. Store: MongoDB, PostgreSQL, Redis
4. UI fetches from backend
