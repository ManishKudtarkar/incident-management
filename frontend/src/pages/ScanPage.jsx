import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { scanUrl, fetchScanHistory, crawlWebsite, fetchCrawlHistory } from "../api/api";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
const CHECK_ICONS = { pass: "✅", warn: "⚠️", fail: "❌" };
const CHECK_COLORS = {
  pass: "text-green-700 bg-green-50 border-green-200",
  warn: "text-yellow-700 bg-yellow-50 border-yellow-200",
  fail: "text-red-700 bg-red-50 border-red-200",
};

function CheckRow({ check }) {
  const icon = CHECK_ICONS[check.status] || "ℹ️";
  const color = CHECK_COLORS[check.status] || "text-gray-700 bg-gray-50 border-gray-200";
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 border rounded-lg ${color}`}>
      <span className="flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold text-xs">{check.name}</p>
        <p className="text-xs opacity-75 mt-0.5">{check.detail}</p>
      </div>
    </div>
  );
}

function StatusBadge({ count }) {
  if (count === 0)
    return <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">✓ Clean</span>;
  return <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">🔔 {count} signal{count !== 1 ? "s" : ""}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single URL scan tab
// ─────────────────────────────────────────────────────────────────────────────
const EXAMPLE_URLS = [
  "https://httpstat.us/200",
  "https://httpstat.us/500",
  "https://httpstat.us/503",
  "https://example.com",
];

function SingleScanTab() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try { setHistory(Array.isArray(await fetchScanHistory()) ? await fetchScanHistory() : []); } catch (_) {}
  };

  useEffect(() => { loadHistory(); }, []);

  const handleScan = async (e) => {
    e?.preventDefault();
    const target = url.trim();
    if (!target) return;
    setScanning(true); setResult(null); setError("");
    try {
      const data = await scanUrl(target);
      setResult(data);
      loadHistory();
    } catch (err) { setError(err.message || "Scan failed"); }
    setScanning(false);
  };

  const hasFail = result?.checks?.some((c) => c.status === "fail");
  const allPass = result?.checks?.every((c) => c.status === "pass");

  return (
    <div>
      {/* Input */}
      <form onSubmit={handleScan} className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔗</span>
          <input
            type="text" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={scanning}
            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" disabled={scanning || !url.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-3 rounded-lg text-sm flex-shrink-0">
          {scanning ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Scanning…</> : "Scan URL"}
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-gray-400">Try:</span>
        {EXAMPLE_URLS.map((u) => (
          <button key={u} type="button" onClick={() => setUrl(u)}
            className="text-xs text-blue-600 hover:underline font-mono">{u}</button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠️ {error}</div>}

      {scanning && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-3"></div>
          <p className="font-semibold text-gray-700">Scanning {url}</p>
          <p className="text-sm text-gray-400 mt-1">Fetching URL, checking headers, measuring response time…</p>
        </div>
      )}

      {result && !scanning && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className={`px-5 py-4 flex items-center justify-between border-b ${hasFail ? "bg-red-50 border-red-200" : allPass ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div>
              <p className="font-bold text-sm text-gray-900 break-all">{result.url}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {result.reachable ? `HTTP ${result.status_code} · ${result.response_time_ms?.toFixed(0)}ms · ${result.redirect_count} redirect(s)` : "Unreachable"}
              </p>
            </div>
            <StatusBadge count={result.signals_generated} />
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {result.checks.map((c, i) => <CheckRow key={i} check={c} />)}
          </div>
          {result.signals_generated > 0 && (
            <div className="px-4 pb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-blue-800"><strong>{result.signals_generated} signal{result.signals_generated !== 1 ? "s" : ""}</strong> pushed to incident pipeline.</p>
                <Link to="/" className="ml-4 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold">View Dashboard →</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Scans</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {history.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span className={item.reachable ? "text-green-500" : "text-red-500"}>●</span>
                <span className="flex-1 font-mono text-gray-700 truncate">{item.url}</span>
                <span className="text-gray-400">{item.status_code ? `HTTP ${item.status_code}` : "—"}</span>
                <span className="text-gray-400 w-14 text-right">{item.response_time_ms ? `${item.response_time_ms.toFixed(0)}ms` : "—"}</span>
                <StatusBadge count={item.signals_generated || 0} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full website crawl tab
// ─────────────────────────────────────────────────────────────────────────────
function CrawlTab() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [elapsed, setElapsed] = useState(0);

  const loadHistory = async () => {
    try {
      const data = await fetchCrawlHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  useEffect(() => { loadHistory(); }, []);

  // Live elapsed timer while crawling
  useEffect(() => {
    if (!crawling) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [crawling]);

  const handleCrawl = async (e) => {
    e?.preventDefault();
    const target = url.trim();
    if (!target) return;
    setCrawling(true); setResult(null); setError("");
    try {
      const data = await crawlWebsite(target, maxPages);
      setResult(data);
      loadHistory();
    } catch (err) {
      setError(err.message || "Crawl failed. Is the backend running?");
    }
    setCrawling(false);
  };

  return (
    <div>
      {/* Info box */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🕷️</span>
          <div>
            <p className="font-bold text-purple-900 text-sm">Full Website Crawler</p>
            <p className="text-xs text-purple-700 mt-1">
              Enter your website's root URL. The crawler will discover every internal page
              by following links, then run all 7 health checks on each page simultaneously.
              Any issues found are automatically pushed into the incident pipeline.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-purple-800">
              <span>🔍 Discovers all internal links</span>
              <span>⚡ Scans up to {maxPages} pages concurrently</span>
              <span>🚨 Creates incidents for every issue</span>
              <span>📊 Full report with per-page breakdown</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleCrawl} className="mb-6">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🌐</span>
            <input
              type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              disabled={crawling}
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button type="submit" disabled={crawling || !url.trim()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold px-5 py-3 rounded-lg text-sm flex-shrink-0">
            {crawling
              ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Crawling…</>
              : "🕷️ Crawl Website"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 font-medium">Max pages:</label>
          {[10, 20, 30, 50].map((n) => (
            <button key={n} type="button"
              onClick={() => setMaxPages(n)}
              className={`text-xs px-3 py-1 rounded-full border font-semibold transition-colors ${maxPages === n ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"}`}>
              {n}
            </button>
          ))}
          <span className="text-xs text-gray-400">pages</span>
        </div>
      </form>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠️ {error}</div>}

      {/* Live crawling progress */}
      {crawling && (
        <div className="mb-6 bg-white border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 flex-shrink-0"></div>
            <div>
              <p className="font-bold text-gray-800">Crawling {url}</p>
              <p className="text-sm text-gray-500">Discovering pages and scanning each one… {elapsed}s elapsed</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "Phase 1: Discovering pages", desc: "Following all internal links via BFS", done: elapsed > 3 },
              { label: "Phase 2: Scanning pages", desc: `Running 7 checks on each page (up to ${maxPages} pages)`, done: elapsed > 8 },
              { label: "Phase 3: Ingesting signals", desc: "Pushing issues into the incident pipeline", done: false },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${step.done ? "bg-green-50 text-green-700" : elapsed > i * 3 ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-400"}`}>
                <span>{step.done ? "✅" : elapsed > i * 3 ? "⏳" : "○"}</span>
                <div>
                  <span className="font-semibold">{step.label}</span>
                  <span className="text-xs ml-2 opacity-70">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crawl result */}
      {result && !crawling && (
        <div className="mb-8">
          {/* Summary header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
            <div className={`px-5 py-4 border-b ${result.total_signals > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-gray-900">{result.domain}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Crawled {result.pages_scanned} pages in {(result.duration_ms / 1000).toFixed(1)}s
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {result.total_signals > 0
                    ? <span className="text-sm bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full font-bold">🔔 {result.total_signals} signals generated</span>
                    : <span className="text-sm bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full font-bold">✅ All pages clean</span>}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-gray-100 border-b border-gray-100">
              {[
                { label: "Pages", value: result.pages_scanned, color: "text-gray-900" },
                { label: "Clean", value: result.issues_summary.clean_pages, color: "text-green-600" },
                { label: "Issues", value: result.issues_summary.pages_with_issues, color: result.issues_summary.pages_with_issues > 0 ? "text-red-600" : "text-gray-400" },
                { label: "5xx Errors", value: result.issues_summary.server_errors, color: result.issues_summary.server_errors > 0 ? "text-red-600" : "text-gray-400" },
                { label: "Slow (>2s)", value: result.issues_summary.slow_pages, color: result.issues_summary.slow_pages > 0 ? "text-yellow-600" : "text-gray-400" },
                { label: "Unreachable", value: result.issues_summary.unreachable, color: result.issues_summary.unreachable > 0 ? "text-red-600" : "text-gray-400" },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-3 text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {result.total_signals > 0 && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  <strong>{result.total_signals} signals</strong> pushed to the incident pipeline.
                </p>
                <Link to="/" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold">
                  View Dashboard →
                </Link>
              </div>
            )}
          </div>

          {/* Per-page breakdown */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Page-by-page results — sorted by issues first
          </p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_100px] bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>URL</span>
              <span className="text-center">Status</span>
              <span className="text-center">Time</span>
              <span className="text-center">Issues</span>
            </div>
            {result.pages.map((page, i) => (
              <div key={i} className={`grid grid-cols-[1fr_80px_80px_100px] items-center px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                <span className="font-mono text-xs text-gray-700 truncate pr-2">
                  {page.url.replace(/^https?:\/\/[^/]+/, "") || "/"}
                </span>
                <span className={`text-center text-xs font-semibold ${!page.status_code ? "text-gray-400" : page.status_code >= 500 ? "text-red-600" : page.status_code >= 400 ? "text-yellow-600" : "text-green-600"}`}>
                  {page.status_code || "—"}
                </span>
                <span className={`text-center text-xs ${!page.response_time_ms ? "text-gray-400" : page.response_time_ms > 5000 ? "text-red-600 font-semibold" : page.response_time_ms > 2000 ? "text-yellow-600" : "text-gray-600"}`}>
                  {page.response_time_ms ? `${page.response_time_ms.toFixed(0)}ms` : "—"}
                </span>
                <div className="flex justify-center">
                  <StatusBadge count={page.signals_count} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crawl history */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Previous Crawls</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {history.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span className="text-purple-500">🕷️</span>
                <span className="flex-1 font-mono text-gray-700 truncate">{item.root_url}</span>
                <span className="text-gray-400">{item.pages_scanned} pages</span>
                <span className="text-gray-400">{(item.duration_ms / 1000).toFixed(1)}s</span>
                <StatusBadge count={item.total_signals || 0} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page with tabs
// ─────────────────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const [tab, setTab] = useState("single");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Check a single URL or crawl your entire website — issues become incidents automatically.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-blue-800">
          {[["1️⃣","Enter a URL"],["2️⃣","Backend fetches & checks"],["3️⃣","Issues → signals"],["4️⃣","Incidents on dashboard"]].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2"><span>{icon}</span><span>{text}</span></div>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-2">
          <strong>Checks:</strong> HTTP status · Response time · SSL · Redirects · Security headers · Reachability
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab("single")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "single" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          🔍 Single URL
        </button>
        <button
          onClick={() => setTab("crawl")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "crawl" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          🕷️ Full Website Crawl
        </button>
      </div>

      {tab === "single" ? <SingleScanTab /> : <CrawlTab />}
    </div>
  );
}
