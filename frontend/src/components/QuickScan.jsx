import React, { useState } from "react";
import { scanUrl } from "../api/api";

const CHECK_ICONS = { pass: "✅", warn: "⚠️", fail: "❌" };
const CHECK_COLORS = {
  pass: "text-green-700",
  warn: "text-yellow-700",
  fail: "text-red-700",
};

export default function QuickScan({ onScanComplete }) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleScan = async (e) => {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    setScanning(true);
    setResult(null);
    setError("");
    try {
      const data = await scanUrl(target);
      setResult(data);
      // Tell parent to reload signals
      if (data.signals_generated > 0 && onScanComplete) {
        setTimeout(onScanComplete, 800);
      }
    } catch (err) {
      setError(err.message || "Scan failed");
    }
    setScanning(false);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔍</span>
        <div>
          <h4 className="font-bold text-blue-900 text-sm">Scan a URL</h4>
          <p className="text-xs text-blue-600">
            Enter a URL — the backend fetches it, runs health checks, and adds any
            issues as signals to this incident.
          </p>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleScan} className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com or paste any URL"
          disabled={scanning}
          className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={scanning || !url.trim()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          {scanning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Scanning…
            </>
          ) : (
            "Scan"
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Result summary */}
      {result && !scanning && (
        <div className="mt-3 bg-white border border-blue-200 rounded-lg overflow-hidden">
          {/* URL + status bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-mono text-gray-600 truncate flex-1">{result.url}</span>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              {result.status_code && (
                <span className={`text-xs font-bold ${result.status_code < 400 ? "text-green-600" : "text-red-600"}`}>
                  HTTP {result.status_code}
                </span>
              )}
              {result.response_time_ms && (
                <span className="text-xs text-gray-400">{result.response_time_ms.toFixed(0)}ms</span>
              )}
            </div>
          </div>

          {/* Checks */}
          <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {result.checks.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span>{CHECK_ICONS[c.status] || "ℹ️"}</span>
                <span className={`font-medium ${CHECK_COLORS[c.status] || "text-gray-600"}`}>
                  {c.name}
                </span>
                <span className="text-gray-400 truncate">— {c.detail}</span>
              </div>
            ))}
          </div>

          {/* Signals generated */}
          <div className={`px-3 py-2 border-t text-xs font-semibold flex items-center gap-2 ${
            result.signals_generated > 0
              ? "bg-red-50 border-red-100 text-red-700"
              : "bg-green-50 border-green-100 text-green-700"
          }`}>
            {result.signals_generated > 0 ? (
              <>
                🔔 {result.signals_generated} signal{result.signals_generated !== 1 ? "s" : ""} added to this incident — scroll up to see them
              </>
            ) : (
              <>✓ No issues found — no signals generated</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
