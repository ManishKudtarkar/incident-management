import React, { useState } from "react";
import { submitRCA } from "../api/api";

const ROOT_CAUSE_CATEGORIES = [
  "Infrastructure Failure",
  "Database / RDBMS Issue",
  "Cache Failure",
  "Network / DNS Issue",
  "Application Bug",
  "Deployment / Config Change",
  "Third-party / External Service",
  "Security Incident",
  "Capacity / Scaling Issue",
  "Unknown",
];

function toLocalDatetimeValue(isoString) {
  // Convert ISO string to value usable by datetime-local input
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RCAForm({ incidentId, incidentStartTime, onSubmitted }) {
  const now = new Date().toISOString();

  const [form, setForm] = useState({
    root_cause_category: "",
    root_cause: "",
    fix_applied: "",
    prevention_steps: "",
    // datetime-local inputs use local time format
    incident_start: incidentStartTime
      ? toLocalDatetimeValue(incidentStartTime)
      : toLocalDatetimeValue(now),
    end_time: toLocalDatetimeValue(now),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.root_cause_category) {
      setError("Please select a Root Cause Category.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Convert local datetime-local value back to ISO string for the API
      const payload = {
        root_cause_category: form.root_cause_category,
        root_cause: form.root_cause,
        fix_applied: form.fix_applied,
        prevention_steps: form.prevention_steps,
        // Always send UTC ISO string — parse local datetime-local value as local time
        end_time: new Date(form.end_time).toISOString(),
      };
      await submitRCA(incidentId, payload);
      setSuccess(true);
      onSubmitted && onSubmitted();
    } catch (err) {
      setError(err.message || "Failed to submit RCA. Please try again.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-green-800">RCA submitted successfully</p>
          <p className="text-sm text-green-600">The incident has been marked as Resolved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📝</span>
        <h4 className="font-bold text-gray-900 text-base">Root Cause Analysis</h4>
        <span className="text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
          Required to close
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        All fields are required. The incident cannot be closed without a complete RCA.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Incident timeline ─────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            Incident Timeline
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">
                Incident Start Time
              </label>
              <input
                type="datetime-local"
                name="incident_start"
                value={form.incident_start}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">When did the first signal arrive?</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">
                Resolution Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">When was the incident resolved?</p>
            </div>
          </div>
          {/* Live MTTR preview */}
          {form.incident_start && form.end_time && (
            <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              <strong>MTTR Preview:</strong>{" "}
              {(() => {
                const secs = Math.max(
                  0,
                  Math.floor(
                    (new Date(form.end_time) - new Date(form.incident_start)) / 1000
                  )
                );
                if (secs < 60) return `${secs}s`;
                if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
                return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
              })()}
            </div>
          )}
        </div>

        {/* ── Root Cause Category dropdown ──────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Root Cause Category <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Select the category that best describes the root cause.
          </p>
          <select
            name="root_cause_category"
            value={form.root_cause_category}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select a category —</option>
            {ROOT_CAUSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* ── Text fields ───────────────────────────────────────────── */}
        {[
          {
            name: "root_cause",
            label: "Root Cause",
            hint: "Describe the technical root cause clearly.",
            placeholder: "e.g. Memory leak in the payment service due to unclosed DB connections.",
          },
          {
            name: "fix_applied",
            label: "Fix Applied",
            hint: "Describe the immediate fix that resolved the incident.",
            placeholder: "e.g. Restarted the service and patched the connection pool config.",
          },
          {
            name: "prevention_steps",
            label: "Prevention Steps",
            hint: "List action items to prevent recurrence.",
            placeholder: "e.g. Add connection pool monitoring alert, update code review checklist.",
          },
        ].map((field) => (
          <div key={field.name} className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              {field.label} <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">{field.hint}</p>
            <textarea
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              rows={3}
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        ))}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting…
            </>
          ) : (
            "Submit RCA & Resolve Incident"
          )}
        </button>
      </form>
    </div>
  );
}
