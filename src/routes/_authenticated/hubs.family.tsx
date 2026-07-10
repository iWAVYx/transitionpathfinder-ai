import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { ParentOverviewGrid } from "@/components/dashboard/role/ParentOverviewGrid";
import { IepTranslatorCard } from "@/components/dashboard/IepTranslatorCard";
import { FamilyMeetingPrepCard } from "@/components/dashboard/FamilyMeetingPrepCard";
import { AdvocacyResourcesCard } from "@/components/dashboard/AdvocacyResourcesCard";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/family")({
  beforeLoad: () => ensureRoleAccess(["family", "admin"]),
  head: () => ({
    meta: [
      { title: "Family Planning Hub — TransitionForward" },
      { name: "description", content: "One place for family priorities, documents, meeting prep, and the Pathway Report." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("family-planning")!}>
        <ParentOverviewGrid />
        <IepTranslatorCard isSample />
        <FamilyMeetingPrepCard isSample />
        <AdvocacyResourcesCard isSample />
        <div className="mt-8">
          <StageJourneyCard audience="family" />
        </div>
      </HubShell>
    </SiteShell>
  );
}
