import React from "react";
import { Link } from "react-router-dom";
import { SeverityBadge, StatusBadge } from "./Badge";

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const LEFT_BORDER_COLOR = {
  P0: "border-l-red-500",
  P1: "border-l-orange-500",
  P2: "border-l-yellow-400",
};

export default function IncidentCard({ incident }) {
  const borderClass = LEFT_BORDER_COLOR[incident.severity] || "border-l-slate-300";

  return (
    <Link
      to={`/incident/${incident.id}`}
      className={`block p-4 hover:bg-slate-50 transition-colors duration-150 border-l-4 ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800 text-base truncate">
              {incident.component_id}
            </h3>
            <StatusBadge status={incident.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Incident started {timeAgo(incident.start_time)} on {new Date(incident.start_time).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <SeverityBadge severity={incident.severity} />
          <span className="text-slate-400 text-lg">›</span>
        </div>
      </div>
    </Link>
  );
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const LEFT_BORDER_COLOR = {
  P0: "border-l-red-500",
  P1: "border-l-orange-500",
  P2: "border-l-yellow-400",
};

export default function IncidentCard({ incident }) {
  const borderClass = LEFT_BORDER_COLOR[incident.severity] || "border-l-slate-300";

  return (
    <Link
      to={`/incident/${incident.id}`}
      className={`block p-4 hover:bg-slate-50 transition-colors duration-150 border-l-4 ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800 text-base truncate">
              {incident.component_id}
            </h3>
            <StatusBadge status={incident.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Incident started {timeAgo(incident.start_time)} on {new Date(incident.start_time).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <SeverityBadge severity={incident.severity} />
          <ChevronRightIcon className="h-6 w-6 text-slate-400" />
        </div>
      </div>
    </Link>
  );
}
