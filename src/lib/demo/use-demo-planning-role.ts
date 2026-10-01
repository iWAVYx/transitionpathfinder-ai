import { useCallback, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DemoRoleId } from "./role-previews";
import { useDemoRoleView, WORKSPACE_ROLE_IDS } from "./use-demo-role-view";

/** URL state takes precedence so history restores the perspective for each visit. */
export function useDemoPlanningRole(studentId: string) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const {
    role: storedRole,
    setRole: setStoredRole,
    hydrated,
  } = useDemoRoleView(WORKSPACE_ROLE_IDS);
  const requested = (location.search as Record<string, unknown>).role;
  const requestedStudent = (location.search as Record<string, unknown>).student;
  const role = WORKSPACE_ROLE_IDS.includes(requested as DemoRoleId)
    ? (requested as DemoRoleId)
    : storedRole;

  useEffect(() => {
    if (!hydrated || (requested === role && requestedStudent === studentId)) return;
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
    requested,
    requestedStudent,
    studentId,
    role,
    navigate,
    location.pathname,
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
