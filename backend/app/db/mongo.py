
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "ims")

client = None
db = None

async def get_mongo():
	global client, db
	if client is None:
		client = AsyncIOMotorClient(MONGO_URI)
		db = client[MONGO_DB]
	return db

async def insert_signal(signal: dict):
	db = await get_mongo()
	result = await db.signals.insert_one(signal)
	return str(result.inserted_id)
