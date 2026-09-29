import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { LiveFamilyWorkspaceOverview } from "@/components/dashboard/LiveFamilyWorkspaceOverview";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
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

  return (
    <SiteShell>
      <HubShell hub={getHub("family-planning")!} hideSpokes hideRelatedLinks>
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
            <>
              <LiveFamilyWorkspaceOverview firstName={firstName} snapshot={snapshot} />
              <DashboardWidgetBoard role="family" studentId={snapshot.student.id} />
            </>
          ) : (
            <div className="border-y border-border/70 py-10 text-center">
              <p className="font-display text-xl">No connected student yet.</p>
              <p className="mt-2 text-sm text-foreground/75">
                Accept a district invitation or connect a student to begin the family workspace.
              </p>
            </div>
          )}
        </WorkspaceZone>
      </HubShell>
    </SiteShell>
  );
}
