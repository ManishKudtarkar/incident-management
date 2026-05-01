import React from "react";

const SEVERITY_STYLES = {
  P0: "bg-red-100 text-red-700 border border-red-300",
  P2: "bg-yellow-100 text-yellow-700 border border-yellow-300",
};

const STATUS_STYLES = {
  OPEN:          "bg-blue-100 text-blue-700 border border-blue-300",
  INVESTIGATING: "bg-purple-100 text-purple-700 border border-purple-300",
  RESOLVED:      "bg-green-100 text-green-700 border border-green-300",
  CLOSED:        "bg-gray-100 text-gray-600 border border-gray-300",
};

const STATUS_DOTS = {
  OPEN:          "bg-blue-500 animate-pulse",
  INVESTIGATING: "bg-purple-500 animate-pulse",
  RESOLVED:      "bg-green-500",
  CLOSED:        "bg-gray-400",
};

export function SeverityBadge({ severity }) {
  const style = SEVERITY_STYLES[severity] || "bg-gray-100 text-gray-600 border border-gray-300";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {severity === "P0" && <span className="text-red-500">🔴</span>}
      {severity === "P2" && <span className="text-yellow-500">🟡</span>}
      {severity}
    </span>
  );
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-600 border border-gray-300";
  const dot = STATUS_DOTS[status] || "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {status}
    </span>
  );
}
