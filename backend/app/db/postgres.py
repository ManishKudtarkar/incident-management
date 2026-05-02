import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

POSTGRES_URI = os.getenv(
    "POSTGRES_URI",
    "postgresql+asyncpg://postgres:postgres@postgres:5432/ims",
)

engine = create_async_engine(
    POSTGRES_URI,
    echo=False,
    future=True,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db():
    async with SessionLocal() as session:
        yield session
