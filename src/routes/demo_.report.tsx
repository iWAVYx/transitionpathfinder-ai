import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { PathwayReport, type DemoReportAudience } from "@/components/demo/PathwayReport";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { type DemoRoleId } from "@/lib/demo/role-previews";
import { useDemoPlanningRole } from "@/lib/demo/use-demo-planning-role";
import { demoRoleDashboardLabel, demoRoleDashboardPath } from "@/lib/demo/feature-routes";

export const Route = createFileRoute("/demo_/report")({
  head: () => ({
    meta: [
      { title: "Demo — TransitionForward" },
      {
        name: "description",
        content:
          "Public sample Pathway Report generated live from a fictional student profile. Sample data only.",
      },
    ],
  }),
  component: DemoReportPage,
});

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
        <Link
          to={demoRoleDashboardPath(viewRole)}
          search={{ student: profile.id }}
          className="mb-5 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to {demoRoleDashboardLabel(viewRole)}
        </Link>
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
              grade, product, evidence, and voice — while filtering out themes that don't belong
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
