import React from "react";

const SEVERITY_STYLES = {
  P0: "bg-red-100 text-red-800 border-red-200",
  P1: "bg-orange-100 text-orange-800 border-orange-200",
  P2: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const STATUS_STYLES = {
  OPEN:          "bg-blue-100 text-blue-800 border-blue-200",
  INVESTIGATING: "bg-purple-100 text-purple-800 border-purple-200",
  RESOLVED:      "bg-green-100 text-green-800 border-green-200",
  CLOSED:        "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_DOTS = {
  OPEN:          "bg-blue-500",
  INVESTIGATING: "bg-purple-500 animate-pulse",
  RESOLVED:      "bg-green-500",
  CLOSED:        "bg-slate-400",
};

export function SeverityBadge({ severity }) {
  const style = SEVERITY_STYLES[severity] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200";
  const dot = STATUS_DOTS[status] || "bg-slate-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {status}
    </span>
  );
}
