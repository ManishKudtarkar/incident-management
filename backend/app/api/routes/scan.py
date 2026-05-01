"""
POST /scan/        — scan a single URL
POST /scan/crawl   — crawl entire website (all pages)
GET  /scan/history — last 50 scan results
"""

import time
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.scan_service import scan_url
from app.services.crawl_service import crawl_website
from app.services.ingestion_service import ingest_signal
from app.db.mongo import get_mongo
from app.utils.logger import get_logger

logger = get_logger("scan_route")
router = APIRouter(prefix="/scan", tags=["Scan"])


class ScanRequest(BaseModel):
    url: str


class ScanResponse(BaseModel):
    url: str
    reachable: bool
    status_code: int | None
    response_time_ms: float | None
    redirect_count: int
    content_length_bytes: int | None
    ssl_valid: bool | None
    signals_generated: int
    error: str | None
    checks: list[dict]


@router.post("/", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def scan_endpoint(body: ScanRequest):
    """
    Fetch the given URL, run health checks, and push any findings
    into the signal ingestion pipeline (which creates incidents).
    """
    url = str(body.url).strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    result = await scan_url(url)

    # Build human-readable check list for the response
    checks = []

    # Reachability
    checks.append({
        "name": "Reachability",
        "status": "pass" if result.reachable else "fail",
        "detail": "URL is reachable" if result.reachable else (result.error or "Unreachable"),
    })

    # HTTP status
    if result.status_code is not None:
        ok = 200 <= result.status_code < 400
        checks.append({
            "name": "HTTP Status",
            "status": "pass" if ok else "fail",
            "detail": f"HTTP {result.status_code}",
        })

    # Response time
    if result.response_time_ms is not None:
        rt = result.response_time_ms
        rt_status = "pass" if rt < 2000 else ("warn" if rt < 5000 else "fail")
        checks.append({
            "name": "Response Time",
            "status": rt_status,
            "detail": f"{rt:.0f}ms",
        })

    # SSL
    if result.ssl_valid is not None:
        checks.append({
            "name": "SSL Certificate",
            "status": "pass" if result.ssl_valid else "fail",
            "detail": "Valid SSL certificate" if result.ssl_valid else "Invalid or missing SSL",
        })
    elif url.startswith("http://"):
        checks.append({
            "name": "SSL Certificate",
            "status": "warn",
            "detail": "No HTTPS — plaintext connection",
        })

    # Redirects
    checks.append({
        "name": "Redirects",
        "status": "pass" if result.redirect_count <= 3 else "warn",
        "detail": f"{result.redirect_count} redirect(s)",
    })

    # Security headers — derive from signals
    header_signal = next(
        (s for s in result.signals if "security headers" in s.error_message.lower()), None
    )
    checks.append({
        "name": "Security Headers",
        "status": "warn" if header_signal else "pass",
        "detail": header_signal.detail if header_signal else "All key security headers present",
    })

    # ── Ingest signals into the pipeline ─────────────────────────────────
    for sig in result.signals:
        await ingest_signal({
            "component_id": sig.component_id,
            "timestamp": sig.timestamp,
            "error_message": sig.error_message,
            "severity_hint": sig.severity,
            "source_url": url,
        })

    # ── Persist scan result to MongoDB for history ────────────────────────
    try:
        db = await get_mongo()
        await db.scan_history.insert_one({
            "url": url,
            "scanned_at": time.time(),
            "status_code": result.status_code,
            "response_time_ms": result.response_time_ms,
            "signals_generated": len(result.signals),
            "reachable": result.reachable,
            "error": result.error,
        })
    except Exception as exc:
        logger.warning("Failed to save scan history: %s", exc)

    return ScanResponse(
        url=url,
        reachable=result.reachable,
        status_code=result.status_code,
        response_time_ms=result.response_time_ms,
        redirect_count=result.redirect_count,
        content_length_bytes=result.content_length_bytes,
        ssl_valid=result.ssl_valid,
        signals_generated=len(result.signals),
        error=result.error,
        checks=checks,
    )


@router.get("/history")
async def scan_history():
    """Return the last 50 scan results."""
    try:
        db = await get_mongo()
        cursor = db.scan_history.find({}, {"_id": 0}).sort("scanned_at", -1).limit(50)
        return await cursor.to_list(50)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class CrawlRequest(BaseModel):
    url: str
    max_pages: int = 30


@router.post("/crawl", status_code=status.HTTP_200_OK)
async def crawl_endpoint(body: CrawlRequest):
    """
    Crawl an entire website: discover all internal pages via BFS,
    scan each one, ingest all findings as signals, return full report.
    """
    url = str(body.url).strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    max_pages = max(1, min(body.max_pages, 50))  # cap at 50

    result = await crawl_website(url, max_pages=max_pages)

    # Ingest signals from the already-completed scans (no re-scanning)
    total_ingested = 0
    for scan_result in result._scan_results:
        for sig in scan_result.signals:
            await ingest_signal({
                "component_id": sig.component_id,
                "timestamp": sig.timestamp,
                "error_message": sig.error_message,
                "severity_hint": sig.severity,
                "source_url": scan_result.url,
            })
            total_ingested += 1

    # Save crawl summary to MongoDB
    try:
        db = await get_mongo()
        await db.crawl_history.insert_one({
            "root_url": result.root_url,
            "domain": result.domain,
            "crawled_at": time.time(),
            "pages_scanned": result.pages_scanned,
            "total_signals": total_ingested,
            "duration_ms": result.duration_ms,
            "issues_summary": result.issues_summary,
        })
    except Exception as exc:
        logger.warning("Failed to save crawl history: %s", exc)

    return {
        "root_url": result.root_url,
        "domain": result.domain,
        "pages_found": result.pages_found,
        "pages_scanned": result.pages_scanned,
        "total_signals": total_ingested,
        "duration_ms": result.duration_ms,
        "issues_summary": result.issues_summary,
        "pages": [
            {
                "url": p.url,
                "status_code": p.status_code,
                "response_time_ms": p.response_time_ms,
                "signals_count": p.signals_count,
                "reachable": p.reachable,
                "error": p.error,
                "checks": p.checks,
            }
            for p in sorted(result.pages, key=lambda x: x.signals_count, reverse=True)
        ],
    }


@router.get("/crawl/history")
async def crawl_history():
    """Return the last 20 crawl results."""
    try:
        db = await get_mongo()
        cursor = db.crawl_history.find({}, {"_id": 0}).sort("crawled_at", -1).limit(20)
        return await cursor.to_list(20)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
