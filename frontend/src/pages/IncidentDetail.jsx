import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { closeIncident, fetchIncidentDetail, updateIncidentStatus } from "../api/api";
import RCAForm from "../components/RCAForm";
import SignalList from "../components/SignalList";
import QuickScan from "../components/QuickScan";
import { SeverityBadge, StatusBadge } from "../components/Badge";
import AttachmentList from "../components/AttachmentList";

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
              ? "→ Incident resolved. Close it using the button in the Actions panel."
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

function InfoRow({ label, value, isMono = false }) {
  return (
    <div className="flex items-start gap-2 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-32 flex-shrink-0 font-semibold uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm text-gray-800 font-medium ${isMono ? "font-mono" : ""}`}>
        {value}
      </span>
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
    fetchIncidentDetail(id)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const refetch = () => {
    // brief delay to allow backend to process
    setTimeout(load, 200);
  };

  const handleStatusUpdate = async (newStatus) => {
    setTransitioning(true);
    try {
      await updateIncidentStatus(id, newStatus);
      refetch();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
    setTransitioning(false);
  };

  const handleClose = async () => {
    setTransitioning(true);
    try {
      await closeIncident(id);
      refetch();
    } catch (err) {
      setError(err.message || "Failed to close incident");
    }
    setTransitioning(false);
  };

  if (loading && !data) {
    return <div className="p-6 text-center">Loading incident...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }
  if (!data) {
    return <div className="p-6 text-center">Incident not found.</div>;
  }

  const { incident, signals, rca } = data;

  return (
    <div className="p-4 md:p-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          <h2 className="text-xl font-bold text-gray-800">Incident Details</h2>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
      </div>

      <LifecycleBar status={incident.status} />
      <IncidentSummaryBanner incident={incident} signals={signals} />

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Details Card ──────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Incident Details</h3>
            </div>
            <div className="p-4">
              <InfoRow label="Incident ID" value={incident.id} isMono />
              <InfoRow label="Component ID" value={incident.component_id} isMono />
              <InfoRow label="Severity" value={incident.severity} />
              <InfoRow label="Status" value={incident.status} />
              <InfoRow
                label="Start Time"
                value={new Date(incident.start_time).toLocaleString()}
              />
              {incident.end_time && (
                <InfoRow
                  label="End Time"
                  value={new Date(incident.end_time).toLocaleString()}
                />
              )}
            </div>
          </div>

          {/* ── RCA Card ──────────────────────────────────────────── */}
          {rca && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Root Cause Analysis</h3>
              </div>
              <div className="p-4">
                <InfoRow label="Root Cause" value={rca.root_cause} />
                <InfoRow label="Category" value={rca.root_cause_category} />
                <InfoRow label="Fix Applied" value={rca.fix_applied} />
                <InfoRow label="Prevention" value={rca.prevention_steps} />
                <AttachmentList attachments={incident.attachments} />
              </div>
            </div>
          )}

          {/* ── Signals Card ──────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Signals</h3>
            </div>
            <div className="p-4">
              <SignalList signals={signals} />
            </div>
          </div>
        </div>

        {/* ── Right Column ────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* ── Actions Card ──────────────────────────────────────── */}
          {incident.status !== "CLOSED" && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Actions</h3>
              </div>
              <div className="p-4">
                {incident.status === "OPEN" && (
                  <button
                    onClick={() => handleStatusUpdate("INVESTIGATING")}
                    disabled={transitioning}
                    className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {transitioning ? "..." : "Start Investigating"}
                  </button>
                )}

                {incident.status === "RESOLVED" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      The RCA has been submitted and the incident is resolved. You can now
                      formally close this incident.
                    </p>
                    <button
                      onClick={handleClose}
                      disabled={transitioning}
                      className="w-full px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-300"
                    >
                      {transitioning ? "..." : "Close Incident"}
                    </button>
                  </div>
                )}

                {incident.status === "INVESTIGATING" && (
                  <RCAForm
                    incidentId={id}
                    incidentStartTime={incident.start_time}
                    onSubmitted={refetch}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Scan Card ─────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-4">
              <QuickScan />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
