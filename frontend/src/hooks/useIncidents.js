import { useCallback, useEffect, useState } from "react";
import { fetchIncidents } from "../api/api";

export default function useIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIncidents()
      .then((data) => {
        setIncidents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load incidents");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { incidents, loading, error, reload: load };
}
