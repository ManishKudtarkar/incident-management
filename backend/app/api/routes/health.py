from fastapi import APIRouter
import asyncio
import time

router = APIRouter(prefix="/health", tags=["Health"])

metrics = {
	"signals_per_second": 0,
	"queue_size": 0,
	"last_updated": time.time(),
}

@router.get("/")
async def health_check():
	return {"status": "ok", "metrics": metrics}

# Background task to log metrics every 5 seconds
async def log_metrics(signal_queue):
	while True:
		metrics["queue_size"] = signal_queue.qsize()
		# signals_per_second would be updated by worker
		metrics["last_updated"] = time.time()
		print(f"[METRICS] {metrics}")
		await asyncio.sleep(5)
