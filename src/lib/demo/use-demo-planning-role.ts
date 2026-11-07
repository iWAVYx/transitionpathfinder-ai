import { useCallback, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DemoRoleId } from "./role-previews";
import { useDemoRoleView, WORKSPACE_ROLE_IDS } from "./use-demo-role-view";

// Only pages that actually render this planning hook may canonicalize their URL.
// Dashboards, Builder and prepared excerpts have their own role/context rules.
const LEGACY_PLANNING_PATHS = new Set([
  "/demo/voice", "/demo/documents", "/demo/resources", "/demo/opportunities",
  "/demo/plan", "/demo/meeting", "/demo/calendar", "/demo/hub", "/demo/next",
]);

/** URL state takes precedence so history restores the perspective for each visit. */
export function useDemoPlanningRole(studentId: string) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const resolvedPathname = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  const {
    role: storedRole,
    setRole: setStoredRole,
    hydrated,
  } = useDemoRoleView(WORKSPACE_ROLE_IDS);
  const search = location.search as Record<string, unknown>;
  const planningPage = LEGACY_PLANNING_PATHS.has(location.pathname)
    || (location.pathname === "/demo/report" && search.example !== "builder" && search.example !== "plan-details")
    || (location.pathname.startsWith("/demo/workspace/") && location.pathname !== "/demo/workspace/start");
  const requested = search.role;
  const requestedStudent = (location.search as Record<string, unknown>).student;
  const role = WORKSPACE_ROLE_IDS.includes(requested as DemoRoleId)
    ? (requested as DemoRoleId)
    : storedRole;

  useEffect(() => {
    // A departing page can observe the next location before it unmounts.
    // Never canonicalize that destination using this page's planning state.
    if (!planningPage || location.pathname !== resolvedPathname || !hydrated || (requested === role && requestedStudent === studentId)) return;
    // Canonicalize old bookmarks without adding a spurious history entry.
    void navigate({
      to: location.pathname,
      search: (previous: Record<string, unknown>) => ({ ...previous, role, student: studentId }),
      hash: location.hash,
      replace: true,
      resetScroll: false,
    });
  }, [
    hydrated,
    planningPage,
    requested,
    requestedStudent,
    studentId,
    role,
    navigate,
    location.pathname,
    resolvedPathname,
    location.hash,
  ]);

  const setRole = useCallback(
    (next: DemoRoleId) => {
      if (!WORKSPACE_ROLE_IDS.includes(next)) return;
      setStoredRole(next);
      void navigate({
        to: location.pathname,
        search: (previous: Record<string, unknown>) => ({
          ...previous,
          role: next,
          student: studentId,
        }),
        hash: location.hash,
        resetScroll: false,
      });
    },
    [setStoredRole, navigate, location.pathname, location.hash, studentId],
  );

  return { role, setRole };
}
