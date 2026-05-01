// When served via nginx (production), use the /api proxy so all requests
// stay on the same origin (http://localhost) — no CORS issues.
// In local dev (npm run dev), fall back to the direct backend URL.
const API_URL = import.meta.env.VITE_API_URL || "/api";

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchIncidents() {
  const res = await fetch(`${API_URL}/incident/`);
  return handleResponse(res);
}

export async function fetchIncidentDetail(id) {
  const res = await fetch(`${API_URL}/incident/${id}`);
  return handleResponse(res);
}

export async function submitRCA(incidentId, rca) {
  const res = await fetch(`${API_URL}/rca/${incidentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rca),
  });
  return handleResponse(res);
}

export async function closeIncident(incidentId) {
  const res = await fetch(`${API_URL}/rca/close/${incidentId}`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function updateIncidentStatus(incidentId, newStatus) {
  const res = await fetch(
    `${API_URL}/incident/${incidentId}/status?new_status=${encodeURIComponent(newStatus)}`,
    { method: "PATCH" }
  );
  return handleResponse(res);
}

export async function scanUrl(url) {
  const res = await fetch(`${API_URL}/scan/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handleResponse(res);
}

export async function fetchScanHistory() {
  const res = await fetch(`${API_URL}/scan/history`);
  return handleResponse(res);
}

export async function crawlWebsite(url, maxPages = 30) {
  const res = await fetch(`${API_URL}/scan/crawl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, max_pages: maxPages }),
  });
  return handleResponse(res);
}

export async function fetchCrawlHistory() {
  const res = await fetch(`${API_URL}/scan/crawl/history`);
  return handleResponse(res);
}
