import React from "react";
import { Link } from "react-router-dom";
import { SeverityBadge, StatusBadge } from "./Badge";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const LEFT_BORDER = {
  P0: "border-l-4 border-l-red-500",
  P2: "border-l-4 border-l-yellow-400",
};

export default function IncidentCard({ incident }) {
  const border = LEFT_BORDER[incident.severity] || "border-l-4 border-l-gray-300";
  const isActive = incident.status === "OPEN" || incident.status === "INVESTIGATING";

  return (
    <Link
      to={`/incident/${incident.id}`}
      className={`block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3 ${border} overflow-hidden`}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-mono mb-0.5">{incident.id}</p>
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {incident.component_id}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            Started{" "}
            <span className="font-medium text-gray-700">
              {timeAgo(incident.start_time)}
            </span>
            {" · "}
            {new Date(incident.start_time).toLocaleString()}
          </span>
          {incident.end_time && (
            <span className="text-green-600 font-medium">
              Resolved {timeAgo(incident.end_time)}
            </span>
          )}
          {isActive && (
            <span className="text-blue-600 font-medium">View details →</span>
          )}
        </div>
      </div>
    </Link>
  );
}
