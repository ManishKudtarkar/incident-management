import React, { useState } from "react";
import { submitRCA } from "../api/api";

const FIELDS = [
  {
    name: "root_cause",
    label: "Root Cause",
    placeholder: "What caused this incident? e.g. Memory leak in the payment service due to unclosed DB connections.",
    hint: "Describe the technical root cause clearly.",
  },
  {
    name: "fix_applied",
    label: "Fix Applied",
    placeholder: "What was done to resolve it? e.g. Restarted the service and patched the connection pool config.",
    hint: "Describe the immediate fix that resolved the incident.",
  },
  {
    name: "prevention_steps",
    label: "Prevention Steps",
    placeholder: "How will this be prevented in future? e.g. Add connection pool monitoring alert, code review checklist updated.",
    hint: "List action items to prevent recurrence.",
  },
];

export default function RCAForm({ incidentId, onSubmitted }) {
  const [form, setForm] = useState({
    root_cause: "",
    fix_applied: "",
    prevention_steps: "",
    end_time: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await submitRCA(incidentId, form);
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
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📝</span>
        <h4 className="font-bold text-gray-900 text-base">Root Cause Analysis</h4>
        <span className="text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
          Required to close
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Complete all three sections before this incident can be closed.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.name} className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              {field.label}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">{field.hint}</p>
            <textarea
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              rows={3}
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
