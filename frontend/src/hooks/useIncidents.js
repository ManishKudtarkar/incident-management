import { useCallback, useEffect, useRef, useState } from "react";
import { fetchIncidents } from "../api/api";

export default function useIncidents({ refreshMs = 5000, live = true } = {}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const inFlight = useRef(false);

  const load = useCallback((silent = false) => {
    if (inFlight.current) return Promise.resolve();
    inFlight.current = true;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    return fetchIncidents()
      .then((data) => {
        setIncidents(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load incidents");
        setLoading(false);
        setRefreshing(false);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!live || refreshMs <= 0) return undefined;
    const timer = setInterval(() => {
      load(true);
    }, refreshMs);
    return () => clearInterval(timer);
  }, [live, load, refreshMs]);

  return { incidents, loading, refreshing, error, lastUpdated, reload: () => load(false) };
}
