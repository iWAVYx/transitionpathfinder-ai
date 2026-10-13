import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Keep organizational readers bound to the most recent selection/load. */
export function useOrganizationDashboardLoad<T>(
  fetchDashboard: (id?: string) => Promise<T>,
  selectedId: (dashboard: T) => string | null,
  failureMessage: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>();
  const currentId = useRef<string | undefined>(undefined);
  const request = useRef(0);
  const alive = useRef(false);
  const fetchRef = useRef(fetchDashboard);
  const selectedRef = useRef(selectedId);
  fetchRef.current = fetchDashboard;
  selectedRef.current = selectedId;

  const reload = useCallback(async (nextId?: string) => {
    if (!alive.current) return;
    const ticket = ++request.current;
    const requestedId = nextId ?? currentId.current;
    currentId.current = requestedId;
    setId(requestedId);
    // Remove departed rows and mutation/export controls before the new load.
    setData(null);
    setLoading(true);
    try {
      const dashboard = await fetchRef.current(requestedId);
      if (!alive.current || ticket !== request.current) return;
      const resolvedId = selectedRef.current(dashboard) ?? undefined;
      setData(dashboard);
      currentId.current = resolvedId;
      setId(resolvedId);
    } catch {
      if (alive.current && ticket === request.current) toast.error(failureMessage);
    } finally {
      if (alive.current && ticket === request.current) setLoading(false);
    }
  }, [failureMessage]);

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
      ++request.current;
    };
  }, [reload]);

  return { data, loading, id, reload };
}
