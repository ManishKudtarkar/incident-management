import time

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self, rate_limit: int):
        self.rate_limit = rate_limit
        self.last_reset = time.time()
        self.count = 0

    async def allow(self) -> bool:
        now = time.time()
        if now - self.last_reset > 1:
            self.last_reset = now
            self.count = 0
        self.count += 1
        return self.count <= self.rate_limit


class RedisRateLimiter:
    def __init__(self, redis, key: str, rate_limit: int):
        self.redis = redis
        self.key = key
        self.rate_limit = rate_limit

    async def allow(self) -> bool:
        count = await self.redis.incr(self.key)
        if count == 1:
            await self.redis.expire(self.key, 1)
        return count <= self.rate_limit


async def get_rate_limiter():
    try:
        from redis.asyncio import from_url
        redis = await from_url(settings.REDIS_URI, decode_responses=True)
        return RedisRateLimiter(redis, "signal_rate", settings.RATE_LIMIT)
    except Exception:
        pass
    return InMemoryRateLimiter(settings.RATE_LIMIT)
