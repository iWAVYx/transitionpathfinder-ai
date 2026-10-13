import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Keep organizational readers bound to the most recent selection/load. */
export function useOrganizationDashboardLoad<T>(
  fetchDashboard: (id?: string) => Promise<T>,
  selectedId: (dashboard: T) => string | null,
  failureMessage: string,
  context?: { id?: string; active: boolean },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>();
  const currentId = useRef<string | undefined>(undefined);
  const request = useRef(0);
  const activeContext = useRef(context);
  activeContext.current = context;
  const accepted = useRef<T | null>(null);
  const [loadContext, setLoadContext] = useState(context?.id);
  const alive = useRef(false);
  const fetchRef = useRef(fetchDashboard);
  const selectedRef = useRef(selectedId);
  fetchRef.current = fetchDashboard;
  selectedRef.current = selectedId;

  const reload = useCallback(
    async (nextId?: string) => {
      if (!alive.current || activeContext.current?.active === false) return;
      const ticket = ++request.current;
      const externalId = activeContext.current?.id;
      setLoadContext(externalId);
      const requestedId = nextId ?? (activeContext.current ? externalId : currentId.current);
      const isCurrent = () =>
        alive.current &&
        ticket === request.current &&
        activeContext.current?.active !== false &&
        externalId === activeContext.current?.id;
      currentId.current = requestedId;
      setId(requestedId);
      // Remove departed rows and mutation/export controls before the new load.
      accepted.current = null;
      setData(null);
      setLoading(true);
      try {
        const dashboard = await fetchRef.current(requestedId);
        if (!isCurrent()) return;
        const resolvedId = selectedRef.current(dashboard) ?? undefined;
        // Never silently display another organization when an explicit requested ID is unavailable.
        if (activeContext.current && requestedId && resolvedId !== requestedId)
          throw new Error("Organization selection is unavailable.");
        accepted.current = dashboard;
        setData(dashboard);
        currentId.current = resolvedId;
        setId(resolvedId);
      } catch {
        if (isCurrent()) toast.error(failureMessage);
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [failureMessage],
  );

  useEffect(() => {
    alive.current = true;
    if (context?.active === false) {
      accepted.current = null;
      setData(null);
      setLoading(true);
    } else if (!(accepted.current && context?.id === currentId.current)) {
      void reload(context?.id);
    }
    return () => {
      alive.current = false;
      ++request.current;
    };
  }, [reload, context?.id, context?.active]);

  const matchesContext =
    !context ||
    (context.active && (loadContext === context.id || (accepted.current && id === context.id)));
  return { data: matchesContext ? data : null, loading: loading || !matchesContext, id, reload };
}
