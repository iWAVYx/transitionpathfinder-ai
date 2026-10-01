import { SchoolAdminOverviewGrid } from "@/components/dashboard/role/SchoolAdminOverviewGrid";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { createFileRoute } from "@tanstack/react-router";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";

import { ensureRoleAccess } from "@/lib/route-role-guard";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

// School Overview intentionally does NOT wrap the component in `withRoleGuard`
// on top of `SchoolPageShell` — SchoolPageShell already renders the semantic
// <main> and gates its inner content with <RoleGuard>. Double-wrapping caused
// the outer guard's fallback <main> to swap with the shell's <main> during
// the auth-check → allowed transition, which on the mobile viewport left
// Playwright without a visible <main> to attach to. `beforeLoad` +
// SchoolPageShell's inner RoleGuard already provide defense-in-depth on top
// of RLS.
export const Route = createFileRoute("/_authenticated/school/overview")({
  head: () => ({ meta: [{ title: "School Overview — TransitionForward" }] }),
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  errorComponent: dashboardErrorComponent("school_admin"),
  component: SchoolOverviewPage,
});

function SchoolOverviewPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/overview"
      title="School Overview"
      subtitle="Implementation, team activity, and transition planning across your school — at a glance."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {(_, d) => (
        <div className="space-y-6 sm:space-y-8">
          <RoleValueStrip role="school" />
          <SchoolAdminOverviewGrid liveData={d} selectedOrgId={orgId} hideOverview />
          <DashboardWidgetBoard role="school_admin" />
        </div>
      )}
    </SchoolPageShell>
  );
}
