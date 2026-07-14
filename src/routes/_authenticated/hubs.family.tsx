import { createFileRoute } from "@tanstack/react-router";
import { FileText, Users2, BookOpen, ShieldCheck, HeartHandshake } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { ParentOverviewGrid } from "@/components/dashboard/role/ParentOverviewGrid";
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
      <HubShell hub={getHub("family-planning")!} hideSpokes>
        <WorkspaceZone>
          <ParentOverviewGrid />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Operations"
          title="Documents, Meetings & Advocacy"
          description="Jump into the tools that keep your student's plan moving."
          gap="tight"
        >
          <DashboardRowList
            rows={[
              {
                icon: FileText,
                title: "IEP & Transition Translator",
                description: "Plain-language summary of the current plan, goals, accommodations, and services.",
                to: "/documents",
                status: "Plan active",
                tone: "success",
              },
              {
                icon: Users2,
                title: "Meeting Prep",
                description: "Question sets for the case manager, school team, adult services, and your student.",
                to: "/meetings",
                status: "PPT · Sep 15",
                tone: "warn",
              },
              {
                icon: HeartHandshake,
                title: "Family Priorities",
                description: "Share what matters most so the team plans around your family's goals.",
                to: "/family/priorities",
              },
              {
                icon: ShieldCheck,
                title: "Consents & Releases",
                description: "Track signed consents and outstanding releases in one place.",
                to: "/family/consent",
                status: "1 pending",
                tone: "warn",
              },
              {
                icon: BookOpen,
                title: "Advocacy Resources",
                description: "Know-your-rights guides, peer networks, and adult-services intake.",
                to: "/family/resources/recommended",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="Stage Journey"
          description="Where your student sits on the transition timeline."
          gap="tight"
        >
          <StageJourneyCard audience="family" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
