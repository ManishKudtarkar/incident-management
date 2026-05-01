"""
URL Scanner Service
-------------------
Fetches a given URL, inspects the HTTP response, and converts findings
into signals that flow through the normal incident pipeline.

Checks performed:
  - DNS / connection reachability
  - HTTP status code (4xx → warning, 5xx → critical)
  - Response time (>2s → warning, >5s → critical)
  - SSL certificate validity (HTTPS only)
  - Redirect chain depth (>3 → warning)
  - Response size (>5MB → warning)
  - Missing security headers
"""

import ssl
import time
import urllib.parse
from dataclasses import dataclass, field
from typing import List

import httpx

from app.utils.logger import get_logger

logger = get_logger("scan_service")


@dataclass
class ScanSignal:
    component_id: str
    error_message: str
    severity: str          # "P0" or "P2"
    timestamp: float = field(default_factory=time.time)
    detail: str = ""


@dataclass
class ScanResult:
    url: str
    reachable: bool
    status_code: int | None
    response_time_ms: float | None
    redirect_count: int
    content_length_bytes: int | None
    ssl_valid: bool | None          # None = not HTTPS
    signals: List[ScanSignal] = field(default_factory=list)
    error: str | None = None


SECURITY_HEADERS = [
    "x-content-type-options",
    "x-frame-options",
    "strict-transport-security",
    "content-security-policy",
]


async def scan_url(url: str) -> ScanResult:
    """
    Fetch the URL and return a ScanResult with all findings as signals.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return ScanResult(
            url=url, reachable=False, status_code=None,
            response_time_ms=None, redirect_count=0,
            content_length_bytes=None, ssl_valid=None,
            error="Invalid URL scheme. Only http:// and https:// are supported.",
        )

    host = parsed.netloc or parsed.path
    signals: List[ScanSignal] = []
    result = ScanResult(
        url=url, reachable=False, status_code=None,
        response_time_ms=None, redirect_count=0,
        content_length_bytes=None, ssl_valid=None,
    )

    # ── 1. Fetch the URL ─────────────────────────────────────────────────
    start = time.time()
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(10.0),
            verify=True,
        ) as client:
            response = await client.get(url)

        elapsed_ms = (time.time() - start) * 1000
        result.reachable = True
        result.status_code = response.status_code
        result.response_time_ms = round(elapsed_ms, 1)
        result.redirect_count = len(response.history)
        result.content_length_bytes = len(response.content)

        # ── 2. SSL check ─────────────────────────────────────────────────
        if parsed.scheme == "https":
            result.ssl_valid = True   # httpx verified it (verify=True)

        # ── 3. HTTP status signals ────────────────────────────────────────
        code = response.status_code
        if 500 <= code < 600:
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"HTTP {code} Server Error — {url}",
                severity="P0",
                detail=f"Server returned {code}. Immediate investigation required.",
            ))
        elif 400 <= code < 500:
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"HTTP {code} Client Error — {url}",
                severity="P2",
                detail=f"Server returned {code}. Check URL or authentication.",
            ))
        elif code >= 200 and code < 300:
            # Healthy — no signal needed
            pass

        # ── 4. Response time signals ──────────────────────────────────────
        if elapsed_ms > 5000:
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"Critical response time: {elapsed_ms:.0f}ms — {url}",
                severity="P0",
                detail="Response took >5s. Possible overload or hanging process.",
            ))
        elif elapsed_ms > 2000:
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"Slow response: {elapsed_ms:.0f}ms — {url}",
                severity="P2",
                detail="Response took >2s. Performance degradation detected.",
            ))

        # ── 5. Redirect chain ─────────────────────────────────────────────
        if result.redirect_count > 3:
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"Excessive redirects: {result.redirect_count} hops — {url}",
                severity="P2",
                detail="More than 3 redirects detected. Possible misconfiguration.",
            ))

        # ── 6. Response size ──────────────────────────────────────────────
        if result.content_length_bytes and result.content_length_bytes > 5 * 1024 * 1024:
            mb = result.content_length_bytes / (1024 * 1024)
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"Large response body: {mb:.1f}MB — {url}",
                severity="P2",
                detail="Response body exceeds 5MB. Possible data leak or misconfiguration.",
            ))

        # ── 7. Missing security headers ───────────────────────────────────
        resp_headers_lower = {k.lower() for k in response.headers.keys()}
        missing = [h for h in SECURITY_HEADERS if h not in resp_headers_lower]
        if missing:
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"Missing security headers: {', '.join(missing)} — {url}",
                severity="P2",
                detail=f"Security headers absent: {', '.join(missing)}",
            ))

        # ── 8. SSL missing on HTTP ────────────────────────────────────────
        if parsed.scheme == "http":
            signals.append(ScanSignal(
                component_id=host,
                error_message=f"No HTTPS — plaintext connection to {url}",
                severity="P2",
                detail="Site is served over HTTP. Data is transmitted unencrypted.",
            ))

    except httpx.ConnectError as exc:
        result.error = f"Connection failed: {exc}"
        signals.append(ScanSignal(
            component_id=host,
            error_message=f"Connection refused / DNS failure — {url}",
            severity="P0",
            detail=str(exc),
        ))
    except httpx.TimeoutException:
        result.error = "Request timed out after 10s"
        signals.append(ScanSignal(
            component_id=host,
            error_message=f"Request timeout (>10s) — {url}",
            severity="P0",
            detail="The server did not respond within 10 seconds.",
        ))
    except ssl.SSLCertVerificationError as exc:
        result.ssl_valid = False
        result.error = f"SSL certificate error: {exc}"
        signals.append(ScanSignal(
            component_id=host,
            error_message=f"SSL certificate invalid — {url}",
            severity="P0",
            detail=str(exc),
        ))
    except Exception as exc:
        result.error = str(exc)
        signals.append(ScanSignal(
            component_id=host,
            error_message=f"Unexpected scan error — {url}",
            severity="P0",
            detail=str(exc),
        ))

    result.signals = signals
    logger.info(
        "Scan complete: url=%s status=%s time=%.0fms signals=%d",
        url, result.status_code, result.response_time_ms or 0, len(signals),
    )
    return result
