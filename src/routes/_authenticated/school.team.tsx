import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { LockedFeature } from "@/components/LockedFeature";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/_authenticated/school/team")({
  head: () => ({
    meta: [{ title: "Staff & Team — TransitionForward" }],
  }),
  component: SchoolTeamPage,
});

function SchoolTeamPage() {
  return (
    <SiteShell>
      <RoleGuard path="/school/team">
        <LockedFeature
          eyebrow="School Administrator"
          title="Staff & Team"
          description="Invite educators and case managers, manage their roles, and control which students they support. Coming soon."
        />
      </RoleGuard>
    </SiteShell>
  );
}
