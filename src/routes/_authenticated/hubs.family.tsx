import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { FileText, Users2, BookOpen, ShieldCheck, HeartHandshake, History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { LiveFamilyWorkspaceOverview } from "@/components/dashboard/LiveFamilyWorkspaceOverview";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
import { buildFamilyHubLiveState } from "@/lib/dashboard/family-live-hub";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/lib/golden-path.functions";
import { getHub } from "@/lib/hubs/registry";
import { getProfile } from "@/lib/profile.functions";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import { listStudents } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/hubs/family")({
  beforeLoad: () => ensureRoleAccess(["family", "admin"]),
  head: () => ({
    meta: [
      { title: "Family Planning Hub — TransitionForward" },
      {
        name: "description",
        content:
          "One place for family priorities, documents, meeting prep, and the Pathway Report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const loadStudents = useServerFn(listStudents);
  const loadSnapshot = useServerFn(getDashboardSnapshot);
  const loadProfile = useServerFn(getProfile);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [firstName, setFirstName] = useState("there");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFamilyWorkspace() {
      try {
        const [studentResult, profile] = await Promise.all([
          loadStudents(),
          loadProfile().catch(() => null),
        ]);
        const studentId = studentResult.students[0]?.id;
        const result = await loadSnapshot({ data: studentId ? { student_id: studentId } : {} });
        if (!active) return;

        setSnapshot(result);
        setFirstName(profile?.preferred_name ?? profile?.first_name ?? "there");
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Could not load the Family Hub.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFamilyWorkspace();
    return () => {
      active = false;
    };
  }, [loadProfile, loadSnapshot, loadStudents]);

  const liveState = snapshot ? buildFamilyHubLiveState(snapshot) : null;

  return (
    <SiteShell>
      <HubShell hub={getHub("family-planning")!} hideSpokes>
        <WorkspaceZone>
          {loading ? (
            <div className="border-y border-border/70 py-10 text-center" aria-live="polite">
              <p className="font-display text-xl">Loading your family workspace…</p>
              <p className="mt-2 text-sm text-foreground/75">
                Connecting the preview cards to your authorized student plan.
              </p>
            </div>
          ) : loadError ? (
            <div className="border-y border-destructive/35 py-10 text-center" role="alert">
              <p className="font-display text-xl">We could not load the Family Hub.</p>
              <p className="mt-2 text-sm text-foreground/75">
                Refresh to try again. Your student information has not been changed.
              </p>
            </div>
          ) : snapshot?.student ? (
            <LiveFamilyWorkspaceOverview firstName={firstName} snapshot={snapshot} />
          ) : (
            <div className="border-y border-border/70 py-10 text-center">
              <p className="font-display text-xl">No connected student yet.</p>
              <p className="mt-2 text-sm text-foreground/75">
                Accept a district invitation or connect a student to begin the family workspace.
              </p>
            </div>
          )}
        </WorkspaceZone>
        {liveState ? (
          <>
            <DashboardSection
              eyebrow="Operations"
              title="Documents, Meetings & Advocacy"
              description="Live status from the tools that keep your student's plan moving."
              gap="tight"
            >
              <DashboardRowList
                rows={[
                  {
                    icon: FileText,
                    title: "IEP & Transition Translator",
                    description:
                      "Plain-language summary of the current plan, goals, accommodations, and services.",
                    to: "/documents",
                    ...liveState.operations.documents,
                  },
                  {
                    icon: Users2,
                    title: "Meeting Prep",
                    description:
                      "Question sets for the case manager, school team, adult services, and your student.",
                    to: "/meetings",
                    ...liveState.operations.meeting,
                  },
                  {
                    icon: HeartHandshake,
                    title: "Family Priorities",
                    description:
                      "Share what matters most so the team plans around your family's goals.",
                    to: "/family/priorities",
                    ...liveState.operations.priorities,
                  },
                  {
                    icon: ShieldCheck,
                    title: "Consents & Releases",
                    description: "Track signed consents and outstanding releases in one place.",
                    to: "/family/consent",
                    ...liveState.operations.consent,
                  },
                  {
                    icon: BookOpen,
                    title: "Advocacy Resources",
                    description:
                      "Know-your-rights guides, peer networks, and adult-services intake.",
                    to: "/family/resources/recommended",
                    ...liveState.operations.resources,
                  },
                  {
                    icon: History,
                    title: "Access & Activity History",
                    description:
                      "See who viewed, downloaded, edited, or shared your student's plan and documents.",
                    to: "/family/history",
                  },
                ]}
              />
            </DashboardSection>
            <DashboardSection
              eyebrow="Activity / Next Steps"
              title="Your Family Next Actions"
              description="What needs your attention to keep the plan moving."
              gap="tight"
            >
              <NextActionCardServer
                historyRoute="/family/history"
                title="Your Family Next Actions"
                eyebrow="What Needs Attention"
                description="Live actions and planning gaps from your authorized family workspace."
                suggestionLabel="Open Family Priorities"
                suggestionRoute="/family/priorities"
              />
            </DashboardSection>
            <DashboardSection
              eyebrow="Progress Band"
              title="Stage Journey"
              description="Where your student sits on the transition timeline."
              gap="tight"
            >
              <StageJourneyCard
                audience="family"
                completedStages={liveState.completedStages}
                currentStage={liveState.currentStage}
              />
            </DashboardSection>
          </>
        ) : null}
      </HubShell>
    </SiteShell>
  );
}
