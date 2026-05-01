from app.core.rate_limiter import get_rate_limiter
from app.core.queue import signal_queue

async def ingest_signal(signal):
	limiter = await get_rate_limiter()
	allowed = await limiter.allow()
	if not allowed:
		return False, "Rate limit exceeded"
	await signal_queue.put(signal)
	return True, "queued"
