import React, { useState } from "react";

const SEVERITY_STYLE = {
  P0: "bg-red-100 text-red-700 border border-red-200",
  P2: "bg-yellow-100 text-yellow-700 border border-yellow-200",
};

function SeverityPill({ severity }) {
  if (!severity) return null;
  const style = SEVERITY_STYLE[severity] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${style}`}>
      {severity}
    </span>
  );
}

function SignalRow({ signal, index }) {
  const [open, setOpen] = useState(false);
  const isEven = index % 2 === 0;

  // Detect if this came from a URL scan
  const isFromScan = !!signal.source_url;
  const hasDetail = signal.detail || signal.source_url || signal.severity_hint;

  return (
    <>
      <div
        className={`grid grid-cols-[160px_1fr_auto] items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${
          isEven ? "bg-white" : "bg-gray-50/40"
        } ${hasDetail ? "cursor-pointer hover:bg-blue-50/30 transition-colors" : ""}`}
        onClick={() => hasDetail && setOpen(!open)}
      >
        {/* Timestamp */}
        <span className="font-mono text-xs text-gray-400 pt-0.5 flex-shrink-0">
          {signal.timestamp
            ? new Date(signal.timestamp * 1000).toLocaleString()
            : "—"}
        </span>

        {/* Error message + source URL */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-700 leading-snug">
            {signal.error_message || "Unknown error"}
          </p>
          {isFromScan && (
            <p className="text-xs text-blue-600 font-mono mt-0.5 truncate">
              🔗 {signal.source_url}
            </p>
          )}
        </div>

        {/* Right side: severity + expand hint */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <SeverityPill severity={signal.severity_hint} />
          {hasDetail && (
            <span className="text-gray-300 text-xs">{open ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {/* Expanded detail row */}
      {open && hasDetail && (
        <div className={`px-4 py-3 border-b border-gray-100 text-xs ${isEven ? "bg-blue-50/40" : "bg-blue-50/60"}`}>
          {signal.detail && (
            <p className="text-gray-700 mb-1">
              <span className="font-semibold text-gray-500 uppercase tracking-wide mr-2">Detail</span>
              {signal.detail}
            </p>
          )}
          {signal.source_url && (
            <p className="text-gray-600">
              <span className="font-semibold text-gray-500 uppercase tracking-wide mr-2">Source URL</span>
              <a
                href={signal.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-mono"
                onClick={(e) => e.stopPropagation()}
              >
                {signal.source_url}
              </a>
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default function SignalList({ signals }) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState("table"); // "table" | "raw"

  if (!signals || signals.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 text-center">
        <p className="text-2xl mb-2">📭</p>
        No signals recorded for this incident yet.
      </div>
    );
  }

  const visible = expanded ? signals : signals.slice(0, 5);
  const fromScanCount = signals.filter((s) => s.source_url).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>📡</span>
          Failure Signals
          <span className="bg-gray-200 text-gray-600 text-xs font-mono px-2 py-0.5 rounded-full">
            {signals.length}
          </span>
          {fromScanCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-200">
              {fromScanCount} from URL scan
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === "table" ? "raw" : "table")}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded"
          >
            {view === "table" ? "Raw" : "Table"}
          </button>
        </div>
      </div>

      {/* Raw JSON view */}
      {view === "raw" ? (
        <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-auto max-h-64">
          {JSON.stringify(signals.slice(0, 20), null, 2)}
          {signals.length > 20 && `\n\n... and ${signals.length - 20} more`}
        </pre>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[160px_1fr_auto] gap-3 bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Timestamp</span>
              <span>Error / Source</span>
              <span>Sev.</span>
            </div>

            {visible.map((s, i) => (
              <SignalRow key={i} signal={s} index={i} />
            ))}
          </div>

          {signals.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {expanded ? "Show less ↑" : `Show all ${signals.length} signals ↓`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
