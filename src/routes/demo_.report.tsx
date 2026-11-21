import { ContextualBackLink } from "@/components/navigation/NavigationOriginProvider";
import { DemoOptionalReportSections } from "@/components/demo/DemoOptionalReportSections";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { PathwayReport, type DemoReportAudience } from "@/components/demo/PathwayReport";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { type DemoRoleId } from "@/lib/demo/role-previews";
import { useDemoPlanningRole } from "@/lib/demo/use-demo-planning-role";
import { demoRoleDashboardLabel, demoRoleDashboardPath } from "@/lib/demo/feature-routes";

import { BuilderSampleReport } from "@/components/demo/BuilderSampleReport";

export const Route = createFileRoute("/demo_/report")({
  head: () => ({
    meta: [
      { title: "Demo — TransitionForward" },
      {
        name: "description",
        content:
          "Public sample Pathway Report based on a fictional student profile. Sample data only.",
      },
    ],
  }),
  component: DemoReportRoute,
});

function DemoReportRoute() {
  const search = useRouterState({ select: (state) => state.location.search }) as Record<
    string,
    unknown
  >;
  if (search.example === "plan-details") {
    const requested = search.view ?? search.audience ?? search.role;
    const audience = requested === "student" || requested === "educator" ? requested : "family";
    return <DemoOptionalReportSections audience={audience} builderRole={search.role === "educator" ? "educator" : "family"} />;
  }
  if (search.example === "builder") {
    const explicitView = search.view ?? search.audience;
    const builderAudience = explicitView === "family" || explicitView === "educator"
      ? explicitView : search.role === "educator" ? "educator" : "family";
    const reportView = explicitView === "student" || explicitView === "family" || explicitView === "educator" ? explicitView : builderAudience;
    return <BuilderSampleReport audience={builderAudience} view={reportView} />;
  }
  return <DemoReportPage />;
}

/**
 * Map any DemoRoleId to the three audiences the Pathway Report supports.
 * Roles without a bespoke report lens (school_admin, district_admin,
 * partner, admin) fall back to the Educator frame — the closest existing
 * professional point of view — instead of leaking through as `undefined`.
 */
function toReportAudience(role: DemoRoleId): DemoReportAudience {
  if (role === "student" || role === "family" || role === "educator") return role;
  return "educator";
}

function DemoReportPage() {
  const { profile } = useDemoStudent();
  const { role: viewRole, setRole } = useDemoPlanningRole(profile.id);

  return (
    <SiteShell>
      <DemoRoleLens selectedRole={viewRole} onSelectRole={setRole} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <ContextualBackLink to={demoRoleDashboardPath(viewRole)} search={{ student: profile.id }}
          label={`← Back to ${demoRoleDashboardLabel(viewRole)}`} className="mb-5 inline-block text-sm font-medium text-primary hover:underline" />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Public Demo · Pathway Report
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Age-Aware Pathway Generation
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Choose a fictional student to see how the pathway engine tailors the report to their
              grade, planning needs, sample information, and voice — while filtering out themes that don't belong
              yet.
            </p>
          </div>
          <StudentSwitcher />
        </div>
        <PathwayReport profile={profile} audience={toReportAudience(viewRole)} />
      </div>
    </SiteShell>
  );
}
