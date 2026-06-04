import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { LockedFeature } from "@/components/LockedFeature";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/_authenticated/school/overview")({
  head: () => ({
    meta: [{ title: "School Overview — TransitionForward" }],
  }),
  component: SchoolOverviewPage,
});

function SchoolOverviewPage() {
  return (
    <SiteShell>
      <RoleGuard path="/school/overview">
        <LockedFeature
          eyebrow="School Administrator"
          title="School Overview"
          description="A school-level dashboard showing students, staff, and aggregate transition planning progress for your organization. Launching next."
        />
      </RoleGuard>
    </SiteShell>
  );
}
