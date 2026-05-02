#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL to be ready..."
python -c "
import asyncio, sys, time

async def wait_for_db():
    from app.db.postgres import engine
    for attempt in range(1, 31):
        try:
            async with engine.begin() as conn:
                from sqlalchemy import text
                await conn.execute(text('SELECT 1'))
            print(f'[entrypoint] PostgreSQL ready after {attempt} attempt(s).')
            return
        except Exception as e:
            print(f'[entrypoint] Waiting for DB... attempt {attempt}/30: {e}', file=sys.stderr)
            await asyncio.sleep(2)
    print('[entrypoint] ERROR: PostgreSQL not ready after 60s', file=sys.stderr)
    sys.exit(1)

asyncio.run(wait_for_db())
"

echo "[entrypoint] Running database initialization..."
python -c "
import asyncio
import sys

async def init():
    from app.db.postgres import engine
    from app.models.incident import Base as IncidentBase
    from app.models.rca import RCA  # noqa: F401 - registers RCA table
    from app.models.attachment import Attachment  # noqa: F401 - registers Attachment table
    try:
        async with engine.begin() as conn:
            await conn.run_sync(IncidentBase.metadata.create_all)
        print('[entrypoint] Tables created successfully.')
    except Exception as e:
        print(f'[entrypoint] Table creation warning: {e}', file=sys.stderr)

asyncio.run(init())
"

echo "[entrypoint] Starting gunicorn..."
exec gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 4 \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
