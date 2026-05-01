import json
import os

from redis.asyncio import from_url

REDIS_URI = os.getenv("REDIS_URI", "redis://redis:6379/0")
_redis = None


async def get_redis():
    global _redis
    if _redis is None:
        _redis = await from_url(REDIS_URI, decode_responses=True)
    return _redis


async def cache_active_incident(incident_id: str, data: dict) -> None:
    r = await get_redis()
    await r.set(f"incident:{incident_id}", json.dumps(data))


async def get_active_incident(incident_id: str) -> dict | None:
    r = await get_redis()
    raw = await r.get(f"incident:{incident_id}")
    if raw is None:
        return None
    return json.loads(raw)
