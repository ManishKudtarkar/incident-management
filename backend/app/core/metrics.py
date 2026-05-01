import time
import asyncio

class MetricsLogger:
	def __init__(self):
		self.metrics = {
			"signals_per_second": 0,
			"queue_size": 0,
			"last_updated": time.time(),
		}

	async def log(self, queue):
		while True:
			self.metrics["queue_size"] = queue.qsize()
			self.metrics["last_updated"] = time.time()
			print(f"[METRICS] {self.metrics}")
			await asyncio.sleep(5)
