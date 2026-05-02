"""
Signal Simulator
----------------
Fires realistic failure signals at the IMS API to populate the dashboard
with a mix of P0 (critical) and P2 (warning) incidents.

Usage:
    python scripts/simulate_signals.py              # default: 50 signals over 5s
    python scripts/simulate_signals.py --rate 200   # 200 signals/sec for 5s
    python scripts/simulate_signals.py --burst      # 1000 signals/sec for 10s
"""

import argparse
import random
import threading
import time

import requests

API_URL = "http://localhost:8000/signal/"

# ── Realistic component names ─────────────────────────────────────────────
# Components with "db" in the name → P0 (critical) by the worker
# Others → P2 (warning)
P0_COMPONENTS = [
    "db_primary",
    "db_replica",
    "db_postgres_main",
    "db_mongo_cluster",
    "db_redis_cache",
]

P2_COMPONENTS = [
    "api_gateway",
    "auth_service",
    "payment_service",
    "notification_service",
    "search_service",
    "cdn_edge",
    "queue_kafka",
    "cache_layer",
    "email_worker",
    "file_upload_service",
]

# ── Realistic error messages ──────────────────────────────────────────────
P0_ERRORS = [
    "Connection timeout after 30s — max retries exceeded",
    "Too many connections: pool exhausted (limit: 100)",
    "Deadlock detected on table 'orders' — transaction rolled back",
    "Replication lag exceeded 60s — replica is behind primary",
    "Out of disk space: /var/lib/postgresql (98% full)",
    "Authentication failed: invalid credentials for user 'app_user'",
    "Query timeout: SELECT took >10s on table 'transactions'",
]

P2_ERRORS = [
    "HTTP 503 Service Unavailable — upstream not responding",
    "Response time degraded: p99 latency = 4200ms (threshold: 2000ms)",
    "Memory usage at 87% — approaching limit",
    "Rate limit hit: 429 Too Many Requests from client 10.0.0.5",
    "SSL certificate expires in 7 days",
    "Health check failed: /health returned HTTP 500",
    "Queue depth growing: 8500 messages pending (threshold: 5000)",
    "CPU spike: 94% utilization for >30s",
    "Disk I/O wait: 78% — storage bottleneck detected",
    "Cache miss rate: 62% (expected <20%)",
]


def send_signal(component_id: str, error_message: str) -> None:
    signal = {
        "component_id": component_id,
        "timestamp": time.time(),
        "error_message": error_message,
    }
    try:
        requests.post(API_URL, json=signal, timeout=1.0)
    except Exception:
        pass


def burst_signals(rate: int = 50, duration: int = 5) -> None:
    """Fire `rate` signals per second for `duration` seconds."""
    print(f"\n🚀 Sending {rate} signals/sec for {duration}s → {rate * duration} total signals")
    print(f"   API: {API_URL}")
    print(f"   Mix: ~30% P0 (db components) · ~70% P2 (service components)\n")

    end = time.time() + duration
    sent = 0

    while time.time() < end:
        threads = []
        for _ in range(rate):
            # 30% chance of P0 (db component), 70% P2
            if random.random() < 0.3:
                comp = random.choice(P0_COMPONENTS)
                err = random.choice(P0_ERRORS)
            else:
                comp = random.choice(P2_COMPONENTS)
                err = random.choice(P2_ERRORS)

            t = threading.Thread(target=send_signal, args=(comp, err), daemon=True)
            t.start()
            threads.append(t)

        for t in threads:
            t.join(timeout=2)

        sent += rate
        print(f"   ✓ {sent} signals sent so far…", end="\r")
        time.sleep(1)

    print(f"\n\n✅ Done! Sent ~{sent} signals.")
    print("   Open http://localhost to see the incidents on the dashboard.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IMS Signal Simulator")
    parser.add_argument("--rate", type=int, default=1000, help="Signals per second (default: 1000)")
    parser.add_argument("--duration", type=int, default=1, help="Duration in seconds (default: 1)")
    parser.add_argument("--burst", action="store_true", help="Burst mode: 1000/sec for 10s (10,000 total)")
    args = parser.parse_args()

    if args.burst:
        burst_signals(rate=1000, duration=10)
    else:
        burst_signals(rate=args.rate, duration=args.duration)
