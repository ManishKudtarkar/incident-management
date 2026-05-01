import React, { useState } from "react";
import IncidentCard from "../components/IncidentCard";
import useIncidents from "../hooks/useIncidents";

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`bg-white rounded-lg border ${color} p-4 flex items-center gap-3`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

const STATUS_ORDER = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"];
const FILTER_OPTIONS = ["ALL", "OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"];

export default function Dashboard() {
  const [liveRefresh, setLiveRefresh] = useState(true);
  const { incidents, loading, refreshing, error, lastUpdated, reload } = useIncidents({
    live: liveRefresh,
    refreshMs: 5000,
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Stats
  const p0Count = incidents.filter((i) => i.severity === "P0").length;
  const openCount = incidents.filter((i) => i.status === "OPEN").length;
  const investigatingCount = incidents.filter((i) => i.status === "INVESTIGATING").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;

  // Filter + sort
  const filtered = incidents
    .filter((i) => statusFilter === "ALL" || i.status === statusFilter)
    .filter((i) => severityFilter === "ALL" || i.severity === severityFilter)
    .sort((a, b) => {
      // P0 first, then by status order, then newest first
      if (a.severity !== b.severity) return a.severity === "P0" ? -1 : 1;
      const si = STATUS_ORDER.indexOf(a.status);
      const sj = STATUS_ORDER.indexOf(b.status);
      if (si !== sj) return si - sj;
      return new Date(b.start_time) - new Date(a.start_time);
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-0.5">
            <span>Live incident view</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                liveRefresh
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${liveRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {liveRefresh ? "Auto-refresh 5s" : "Paused"}
            </span>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Last updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiveRefresh((value) => !value)}
            className={`text-sm border px-3 py-2 rounded-lg shadow-sm transition-colors ${
              liveRefresh
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {liveRefresh ? "Live On" : "Live Off"}
          </button>
          <button
            onClick={reload}
            disabled={loading || refreshing}
            className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading || refreshing ? "animate-spin" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Incidents" value={incidents.length} icon="📋" color="border-gray-200" />
        <StatCard label="Critical (P0)" value={p0Count} icon="🔴" color="border-red-200" />
        <StatCard label="Open / Investigating" value={openCount + investigatingCount} icon="🔵" color="border-blue-200" />
        <StatCard label="Resolved / Closed" value={resolvedCount} icon="✅" color="border-green-200" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {["ALL", "P0", "P2"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                severityFilter === s
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {s === "ALL" ? "All Severities" : s}
            </button>
          ))}
        </div>

        {(statusFilter !== "ALL" || severityFilter !== "ALL") && (
          <button
            onClick={() => { setStatusFilter("ALL"); setSeverityFilter("ALL"); }}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Incident list */}
      {loading && !incidents.length ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-semibold text-gray-600">No incidents match your filters</p>
          <p className="text-sm mt-1">
            {incidents.length === 0
              ? "No incidents have been recorded yet."
              : "Try adjusting the filters above."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-3">
            Showing {filtered.length} of {incidents.length} incidents · sorted by severity then status
            {refreshing ? " · syncing..." : ""}
          </p>
          {filtered.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
