import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useOrganizationDashboardLoad } from "./use-organization-dashboard-load";

/** Each history entry owns its selection; no account-independent storage or access grants. */
export function useOrganizationDashboardSelection<T>(
  role: "school" | "district",
  fetchDashboard: (id?: string) => Promise<T>,
  selectedId: (dashboard: T) => string | null,
  failureMessage: string,
) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const resolvedPath = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  const mountedPath = useRef(location.pathname);
  const key = role === "school" ? "org_id" : "district_id";
  const requested = (location.search as Record<string, unknown>)[key];
  const requestedId = typeof requested === "string" ? requested : undefined;
  const active = location.pathname === mountedPath.current;
  const reader = useOrganizationDashboardLoad(fetchDashboard, selectedId, failureMessage, {
    id: requestedId,
    active,
  });
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const current = useRef({ active, id: requestedId ?? reader.id });
  current.current = { active, id: requestedId ?? reader.id };

  useEffect(() => {
    if (
      !active ||
      resolvedPath !== mountedPath.current ||
      requestedId ||
      !reader.data ||
      !reader.id
    )
      return;
    void navigate({
      to: location.pathname,
      search: (previous: Record<string, unknown>) => ({ ...previous, [key]: reader.id }),
      hash: location.hash,
      replace: true,
      resetScroll: false,
    });
  }, [
    active,
    resolvedPath,
    requestedId,
    reader.data,
    reader.id,
    navigate,
    location.pathname,
    location.hash,
    key,
  ]);

  const reload = useCallback(
    async (id?: string) => {
      if (!alive.current || !current.current.active) return;
      if (!id || id === current.current.id) {
        await reader.reload(id);
        return;
      }
      await navigate({
        to: mountedPath.current,
        search: (previous: Record<string, unknown>) => ({ ...previous, [key]: id }),
        hash: location.hash,
        resetScroll: false,
      });
    },
    [navigate, key, location.hash, reader.reload],
  );

  // Save callbacks refresh their original scope only while that scope is still active.
  const refreshIfCurrent = useCallback(
    async (expectedId?: string) => {
      if (
        !alive.current ||
        !current.current.active ||
        !expectedId ||
        expectedId !== current.current.id
      )
        return;
      await reader.reload(expectedId);
    },
    [reader.reload],
  );

  const recoverSelection = useCallback(async () => {
    if (!alive.current || !current.current.active) return;
    await navigate({
      to: mountedPath.current,
      // Explicit undefined prevents the role middleware from retaining the failed key.
      search: (previous: Record<string, unknown>) => ({ ...previous, [key]: undefined }),
      hash: location.hash,
      resetScroll: false,
    });
  }, [navigate, key, location.hash]);

  return {
    ...reader,
    reload,
    refreshIfCurrent,
    recoverSelection: requestedId ? recoverSelection : undefined,
  };
}
