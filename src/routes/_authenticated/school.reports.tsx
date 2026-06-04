import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { LockedFeature } from "@/components/LockedFeature";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/_authenticated/school/reports")({
  head: () => ({
    meta: [{ title: "School Reports — TransitionForward" }],
  }),
  component: SchoolReportsPage,
});

function SchoolReportsPage() {
  return (
    <SiteShell>
      <RoleGuard path="/school/reports">
        <LockedFeature
          eyebrow="School Administrator"
          title="School Reports"
          description="Aggregate readiness, meeting prep activity, and pathway-report status across every student in your school. Coming soon."
        />
      </RoleGuard>
    </SiteShell>
  );
}
