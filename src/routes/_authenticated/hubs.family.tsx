import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
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
  return (
    <OwnerWorkspaceGate>
      <FamilyWorkspace />
    </OwnerWorkspaceGate>
  );
}

function FamilyWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const viewerId = user?.id;
  const loadStudents = useServerFn(listStudents);
  const loadSnapshot = useServerFn(getDashboardSnapshot);
  const loadProfile = useServerFn(getProfile);
  const workspace = useQuery({
    queryKey: ["family-hub", viewerId],
    enabled: !!viewerId && !authLoading,
    queryFn: async ({ signal }) => {
      const current = () => {
        if (signal.aborted) throw new Error("Workspace loading was interrupted.");
      };
      current();
      const [studentResult, profile] = await Promise.all([
        loadStudents({ data: { expected_viewer_id: viewerId } }),
        loadProfile({ data: { expected_viewer_id: viewerId } }).catch(() => null),
      ]);
      current();
      if (studentResult.loadFailed)
        throw new Error("Your student list could not be loaded. Please try again.");
      if (profile && profile.id !== viewerId)
        throw new Error("Your sign-in changed. Please try again.");
      const studentId = studentResult.students[0]?.id;
      const snapshot: DashboardSnapshot | null = studentId
        ? await loadSnapshot({ data: { student_id: studentId, expected_viewer_id: viewerId } })
        : null;
      current();
      if (studentId && snapshot?.student?.id !== studentId)
        throw new Error("The selected student could not be confirmed. Please try again.");
      return { snapshot, firstName: profile?.preferred_name ?? profile?.first_name ?? "there" };
    },
  });
  const loading = authLoading || !viewerId || workspace.isPending;
  const loadError = workspace.isError;
  const snapshot = workspace.data?.snapshot ?? null;
  const firstName = workspace.data?.firstName ?? "there";

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
                Your student information has not been changed. Try loading the workspace again.
              </p>
              <button
                type="button"
                className="mt-3 underline"
                onClick={() => void workspace.refetch()}
              >
                Try Again
              </button>
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
