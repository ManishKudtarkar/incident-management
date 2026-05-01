from datetime import datetime

def now_utc():
	return datetime.utcnow()

def calc_mttr(start_time, end_time):
	if not start_time or not end_time:
		return None
	return (end_time - start_time).total_seconds()
