from app.db.redis import get_redis
from app.utils.constants import REDIS_DEBOUNCE_TTL

async def should_create_incident(component_id):
	redis = await get_redis()
	key = f"debounce:{component_id}"
	exists = await redis.exists(key)
	if exists:
		return False
	await redis.set(key, 1, ex=REDIS_DEBOUNCE_TTL)
	return True
