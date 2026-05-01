import os
from dotenv import load_dotenv
load_dotenv()

class Settings:
	POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql+asyncpg://postgres:postgres@postgres:5432/ims")
	MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
	MONGO_DB = os.getenv("MONGO_DB", "ims")
	REDIS_URI = os.getenv("REDIS_URI", "redis://redis:6379/0")
	RATE_LIMIT = int(os.getenv("RATE_LIMIT", 1000))
	QUEUE_TYPE = os.getenv("QUEUE_TYPE", "memory")
	MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
	MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio")
	MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio123")
	MINIO_BUCKET = os.getenv("MINIO_BUCKET", "ims")

settings = Settings()
