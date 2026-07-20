import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { PathwayReport, type DemoReportAudience } from "@/components/demo/PathwayReport";
import { WorkspaceRolePerspective } from "@/components/demo/WorkspaceRolePerspective";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import { type DemoRoleId } from "@/lib/demo/role-previews";
import { useDemoRoleView } from "@/lib/demo/use-demo-role-view";
import { resolveDemoRoleDestination } from "@/lib/demo/role-routing";

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
  const navigate = useNavigate();
  const { role: viewRole } = useDemoRoleView();

  const handleRoleSelect = (next: DemoRoleId) => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/report",
      targetRole: next,
      studentId: profile.id,
    });
    navigate({ to: dest.to, search: dest.search });
  };

  return (
    <SiteShell>
      <DemoRoleLens onSelectRole={handleRoleSelect} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Public Demo · Pathway Report
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Age-Aware Pathway Generation
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Choose a fictional student to see how the pathway engine
              tailors the report to their grade, product, evidence, and
              voice — while filtering out themes that don't belong yet.
            </p>
          </div>
          <StudentSwitcher />
        </div>
        <WorkspaceRolePerspective role={viewRole} stageId="roadmap" />
        <PathwayReport profile={profile} audience={toReportAudience(viewRole)} />

      </div>
    </SiteShell>
  );
}

