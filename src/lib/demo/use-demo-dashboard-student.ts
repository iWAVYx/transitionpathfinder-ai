import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { DemoProfileId } from "./demo-profiles";
import type { DemoRoleId } from "./role-previews";
import { canonicalDemoDashboard, WORKSPACE_ROLE_IDS } from "./role-routing";

/** Pin an implicit student before tool links return to an explicit dashboard URL. */
export function useDemoDashboardStudent(role: DemoRoleId, student: DemoProfileId, hydrated: boolean) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const resolvedPath = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  const dashboard = canonicalDemoDashboard(role);
  const requested = (location.search as Record<string, unknown>).student;
  useEffect(() => {
    // One dashboard owner performs this replacement, never its child hook consumers
    // or a departing dashboard observing the next tool/role before unmounting.
    if (!hydrated || !WORKSPACE_ROLE_IDS.includes(role) || location.pathname !== dashboard
      || resolvedPath !== dashboard || requested !== undefined) return;
    void navigate({
      to: dashboard,
      search: (previous: Record<string, unknown>) => ({ ...previous, student }),
      hash: location.hash,
      replace: true,
      resetScroll: false,
    });
  }, [hydrated, role, dashboard, location.pathname, location.hash, resolvedPath, requested, student, navigate]);
}
