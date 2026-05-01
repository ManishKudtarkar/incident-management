"""
Website Crawler Service
-----------------------
Crawls an entire website starting from a root URL.
Discovers all internal links by parsing HTML, then scans each page
with the same health checks as the single-URL scanner.

Limits:
  - Max 50 pages per crawl (configurable)
  - Only follows links on the same domain
  - Respects a 10s timeout per page
  - Runs pages concurrently (up to 5 at a time)
"""

import asyncio
import re
import time
import urllib.parse
from dataclasses import dataclass, field
from typing import List, Set

import httpx

from app.services.scan_service import scan_url, ScanResult
from app.utils.logger import get_logger

logger = get_logger("crawl_service")

MAX_PAGES = 50
CONCURRENCY = 5


@dataclass
class PageResult:
    url: str
    status_code: int | None
    response_time_ms: float | None
    signals_count: int
    reachable: bool
    error: str | None
    checks: List[dict] = field(default_factory=list)


@dataclass
class CrawlResult:
    root_url: str
    domain: str
    pages_found: int
    pages_scanned: int
    total_signals: int
    duration_ms: float
    pages: List[PageResult] = field(default_factory=list)
    issues_summary: dict = field(default_factory=dict)
    # Raw scan results for signal ingestion (not serialized to client)
    _scan_results: list = field(default_factory=list)


def _extract_links(html: str, base_url: str, domain: str) -> Set[str]:
    """Extract all internal links from HTML content."""
    links = set()
    # Find all href attributes
    hrefs = re.findall(r'href=["\']([^"\'#?]+)["\']', html, re.IGNORECASE)
    for href in hrefs:
        href = href.strip()
        if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        # Resolve relative URLs
        full_url = urllib.parse.urljoin(base_url, href)
        parsed = urllib.parse.urlparse(full_url)
        # Only follow same-domain links
        if parsed.netloc == domain and parsed.scheme in ("http", "https"):
            # Normalize: remove trailing slash, query, fragment
            clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/') or '/'}"
            links.add(clean)
    return links


async def _fetch_and_extract_links(
    client: httpx.AsyncClient,
    url: str,
    domain: str,
) -> tuple[Set[str], int | None]:
    """Fetch a page and return (discovered_links, status_code)."""
    try:
        resp = await client.get(url, timeout=10.0, follow_redirects=True)
        content_type = resp.headers.get("content-type", "")
        if "html" in content_type:
            links = _extract_links(resp.text, url, domain)
        else:
            links = set()
        return links, resp.status_code
    except Exception:
        return set(), None


async def crawl_website(root_url: str, max_pages: int = MAX_PAGES) -> CrawlResult:
    """
    Crawl the entire website starting from root_url.
    Returns a CrawlResult with per-page scan results and a summary.
    """
    if not root_url.startswith(("http://", "https://")):
        root_url = "https://" + root_url

    parsed_root = urllib.parse.urlparse(root_url)
    domain = parsed_root.netloc
    start_time = time.time()

    logger.info("Starting crawl: root=%s domain=%s max_pages=%d", root_url, domain, max_pages)

    # ── Phase 1: Discover all pages via BFS ──────────────────────────────
    visited: Set[str] = set()
    queue: List[str] = [root_url]
    all_urls: List[str] = []

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(10.0),
        headers={"User-Agent": "IMS-Crawler/1.0"},
    ) as client:
        while queue and len(all_urls) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)
            all_urls.append(url)

            # Discover links from this page
            links, _ = await _fetch_and_extract_links(client, url, domain)
            for link in links:
                if link not in visited and link not in queue:
                    queue.append(link)

            logger.info("Discovered %d pages so far, queue=%d", len(all_urls), len(queue))

    logger.info("Discovery complete: %d pages found", len(all_urls))

    # ── Phase 2: Scan each page concurrently ─────────────────────────────
    semaphore = asyncio.Semaphore(CONCURRENCY)
    page_results: List[PageResult] = []
    all_scan_results: List[ScanResult] = []

    async def scan_one(url: str) -> None:
        async with semaphore:
            result = await scan_url(url)
            all_scan_results.append(result)

            # Build check list (same logic as single scan endpoint)
            checks = []
            checks.append({
                "name": "Reachability",
                "status": "pass" if result.reachable else "fail",
                "detail": "Reachable" if result.reachable else (result.error or "Unreachable"),
            })
            if result.status_code is not None:
                ok = 200 <= result.status_code < 400
                checks.append({
                    "name": "HTTP Status",
                    "status": "pass" if ok else "fail",
                    "detail": f"HTTP {result.status_code}",
                })
            if result.response_time_ms is not None:
                rt = result.response_time_ms
                checks.append({
                    "name": "Response Time",
                    "status": "pass" if rt < 2000 else ("warn" if rt < 5000 else "fail"),
                    "detail": f"{rt:.0f}ms",
                })

            page_results.append(PageResult(
                url=url,
                status_code=result.status_code,
                response_time_ms=result.response_time_ms,
                signals_count=len(result.signals),
                reachable=result.reachable,
                error=result.error,
                checks=checks,
            ))

    await asyncio.gather(*[scan_one(u) for u in all_urls])

    # ── Phase 3: Build summary ────────────────────────────────────────────
    total_signals = sum(len(r.signals) for r in all_scan_results)
    duration_ms = round((time.time() - start_time) * 1000, 1)

    # Count issues by type
    issues_summary = {
        "unreachable": sum(1 for p in page_results if not p.reachable),
        "server_errors": sum(
            1 for p in page_results
            if p.status_code and 500 <= p.status_code < 600
        ),
        "client_errors": sum(
            1 for p in page_results
            if p.status_code and 400 <= p.status_code < 500
        ),
        "slow_pages": sum(
            1 for p in page_results
            if p.response_time_ms and p.response_time_ms > 2000
        ),
        "pages_with_issues": sum(1 for p in page_results if p.signals_count > 0),
        "clean_pages": sum(1 for p in page_results if p.signals_count == 0),
    }

    logger.info(
        "Crawl complete: domain=%s pages=%d signals=%d duration=%.0fms",
        domain, len(all_urls), total_signals, duration_ms,
    )

    return CrawlResult(
        root_url=root_url,
        domain=domain,
        pages_found=len(all_urls),
        pages_scanned=len(page_results),
        total_signals=total_signals,
        duration_ms=duration_ms,
        pages=page_results,
        issues_summary=issues_summary,
        _scan_results=all_scan_results,
    )
