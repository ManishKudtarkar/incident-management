import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { closeIncident, fetchIncidentDetail, updateIncidentStatus } from "../api/api";
import RCAForm from "../components/RCAForm";
import SignalList from "../components/SignalList";
import QuickScan from "../components/QuickScan";
import { SeverityBadge, StatusBadge } from "../components/Badge";

const LIFECYCLE = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"];

// ── Derive a smart summary from real signal data ──────────────────────────
function buildSummary(incident, signals) {
  const comp = incident.component_id;
  const count = signals.length;

  // Collect unique error types from actual signals
  const errorMessages = signals.map((s) => s.error_message).filter(Boolean);
  const uniqueErrors = [...new Set(errorMessages)];

  // Most frequent error
  const freq = {};
  errorMessages.forEach((m) => { freq[m] = (freq[m] || 0) + 1; });
  const topError = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

  // Time since incident started
  const ageMs = Date.now() - new Date(incident.start_time);
  const ageMins = Math.floor(ageMs / 60000);
  const ageStr = ageMins < 1 ? "just now"
    : ageMins < 60 ? `${ageMins} minute${ageMins !== 1 ? "s" : ""} ago`
    : `${Math.floor(ageMins / 60)}h ${ageMins % 60}m ago`;

  // Source URL if from scanner
  const sourceUrl = signals.find((s) => s.source_url)?.source_url;

  return { comp, count, uniqueErrors, topError, ageStr, sourceUrl };
}

function IncidentSummaryBanner({ incident, signals }) {
  if (incident.status === "CLOSED") return null;

  const { comp, count, uniqueErrors, topError, ageStr, sourceUrl } =
    buildSummary(incident, signals);

  const isP0 = incident.severity === "P0";
  const isFromScan = !!sourceUrl;

  const bgColor = isP0
    ? "bg-red-50 border-red-200"
    : "bg-yellow-50 border-yellow-200";
  const titleColor = isP0 ? "text-red-800" : "text-yellow-800";
  const textColor = isP0 ? "text-red-700" : "text-yellow-700";
  const icon = isP0 ? "🚨" : "⚠️";

  return (
    <div className={`mb-4 p-4 border rounded-xl ${bgColor}`}>
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          {/* Dynamic title */}
          <p className={`font-bold text-sm ${titleColor}`}>
            {isP0 ? "Critical Incident" : "Warning Incident"} —{" "}
            <span className="font-mono">{comp}</span>
          </p>

          {/* Dynamic description built from real data */}
          <p className={`text-sm mt-1 ${textColor}`}>
            {isFromScan ? (
              <>
                Detected by URL scan of{" "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-mono break-all"
                >
                  {sourceUrl}
                </a>
                .{" "}
              </>
            ) : null}
            {count > 0 ? (
              <>
                <strong>{count} failure signal{count !== 1 ? "s" : ""}</strong> received
                {" "}starting <strong>{ageStr}</strong>.{" "}
              </>
            ) : null}
            {topError ? (
              <>
                Most frequent error:{" "}
                <span className="font-medium italic">"{topError[0]}"</span>
                {topError[1] > 1 ? ` (${topError[1]}×)` : ""}.{" "}
              </>
            ) : null}
          </p>

          {/* Unique error types as tags */}
          {uniqueErrors.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className={`text-xs ${textColor} opacity-70 mr-1`}>
                Error types:
              </span>
              {uniqueErrors.slice(0, 4).map((e, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    isP0
                      ? "bg-red-100 border-red-200 text-red-700"
                      : "bg-yellow-100 border-yellow-200 text-yellow-700"
                  } font-mono truncate max-w-xs`}
                >
                  {e.length > 50 ? e.slice(0, 50) + "…" : e}
                </span>
              ))}
              {uniqueErrors.length > 4 && (
                <span className={`text-xs ${textColor} opacity-60`}>
                  +{uniqueErrors.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Next action hint */}
          <p className={`text-xs mt-2 ${textColor} opacity-70`}>
            {incident.status === "OPEN"
              ? "→ Click \"Start Investigating\" to claim this incident, then submit an RCA to close it."
              : incident.status === "INVESTIGATING"
              ? "→ Investigation in progress. Fill in the RCA form below once the root cause is identified."
              : incident.status === "RESOLVED"
              ? "→ Incident resolved. Close it using the RCA close button."
              : null}
          </p>
        </div>
      </div>
    </div>
  );
}

function LifecycleBar({ status }) {
  const current = LIFECYCLE.indexOf(status);
  return (
    <div className="flex items-center gap-0 mt-4 mb-6">
      {LIFECYCLE.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done
                    ? "bg-green-500 border-green-500 text-white"
                    : active
                    ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
            {i < LIFECYCLE.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-5 ${
                  i < current ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5 font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIncidentDetail(id)
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.message || "Failed to load incident"); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleTransition = async (newStatus) => {
    setTransitioning(true);
    try {
      await updateIncidentStatus(id, newStatus);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
    setTransitioning(false);
  };

  const handleClose = async () => {
    setTransitioning(true);
    setError(null);
    try {
      await closeIncident(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to close incident");
    }
    setTransitioning(false);
  };

  if (loading && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-60 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { incident, signals } = data;
  const currentIdx = LIFECYCLE.indexOf(incident.status);
  const canTransitionManually = incident.status === "OPEN";

  const duration = incident.start_time && incident.end_time
    ? (() => {
        const secs = Math.floor(
          (new Date(incident.end_time) - new Date(incident.start_time)) / 1000
        );
        if (secs < 60) return `${secs}s`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
        return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
      })()
    : null;

  // Unique components that sent signals
  const affectedComponents = [...new Set(signals.map((s) => s.component_id).filter(Boolean))];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-blue-600 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium font-mono">{incident.id}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2 font-mono">
              {incident.component_id}
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{incident.id}</p>
          </div>

          {canTransitionManually && (
            <button
              onClick={() => handleTransition("INVESTIGATING")}
              disabled={transitioning}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {transitioning ? "Updating…" : "▶ Start Investigating"}
            </button>
          )}
        </div>

        <LifecycleBar status={incident.status} />

        {/* Info rows — all dynamic */}
        <div className="bg-gray-50 rounded-lg px-4 py-1">
          <InfoRow label="Started" value={new Date(incident.start_time).toLocaleString()} />
          {incident.end_time && (
            <InfoRow label="Resolved" value={new Date(incident.end_time).toLocaleString()} />
          )}
          {duration && <InfoRow label="MTTR" value={duration} />}
          <InfoRow
            label="Severity"
            value={incident.severity === "P0"
              ? "P0 — Critical (database/core infrastructure)"
              : "P2 — Warning (service degradation)"}
          />
          <InfoRow
            label="Signals"
            value={`${signals.length} failure event${signals.length !== 1 ? "s" : ""} recorded`}
          />
          {affectedComponents.length > 1 && (
            <InfoRow
              label="Components"
              value={affectedComponents.join(", ")}
            />
          )}
        </div>
      </div>

      {/* Smart dynamic summary banner */}
      <IncidentSummaryBanner incident={incident} signals={signals} />

      {/* Signals */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <SignalList signals={signals} />
      </div>

      {/* Quick URL scan */}
      {incident.status !== "CLOSED" && (
        <div className="mb-4">
          <QuickScan onScanComplete={load} />
        </div>
      )}

      {/* RCA / Closed */}
      {incident.status === "CLOSED" ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <p className="font-bold text-green-800">Incident Closed</p>
            <p className="text-sm text-green-600 mt-0.5">
              RCA submitted. Incident resolved and closed after{" "}
              {duration ? <strong>{duration}</strong> : "an unknown duration"}.
            </p>
          </div>
        </div>
      ) : incident.status === "RESOLVED" ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-bold text-gray-900">RCA submitted</p>
              <p className="text-sm text-gray-500 mt-1">
                Review is complete. Close the incident to finish the lifecycle.
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={transitioning}
              className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {transitioning ? "Closing..." : "Close Incident"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <RCAForm incidentId={incident.id} incidentStartTime={incident.start_time} onSubmitted={load} />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
