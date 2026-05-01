#!/bin/sh
set -e

echo "[entrypoint] Running database initialization..."
python -c "
import asyncio
import sys

async def init():
    from app.db.postgres import engine
    from app.models.incident import Base as IncidentBase
    from app.models.rca import RCA  # noqa: F401 - registers RCA table
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
