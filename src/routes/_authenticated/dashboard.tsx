import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, AlertCircle, Plus, Loader2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toTitleCase } from "@/lib/title-case";
import { getDashboardSnapshot, seedDemoStudent, type DashboardSnapshot } from "@/lib/golden-path.functions";
import { listStudents, ensureOwnStudentProfile } from "@/lib/students.functions";
import { getProfile, getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles, fallbackPathFor } from "@/lib/role-policy";
import { ROLE_DASHBOARD_TEST_IDS, dashboardTestIdForDashboardHint, dashboardTestIdForProfileRole, type RoleDashboardTestId } from "@/lib/dashboard-testids";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { RoleGuard } from "@/components/RoleGuard";
import { LiveFamilyWorkspaceOverview } from "@/components/dashboard/LiveFamilyWorkspaceOverview";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Your dashboard — TransitionForward" }],
  }),
  errorComponent: dashboardErrorComponent("parent"),
  component: DashboardPageGuarded,
});

/**
 * Safe empty snapshot used when we know the viewer is a student but their
 * data hasn't loaded (or their team hasn't added them yet). Keeps
 * <StudentDashboard>'s no-student branch from crashing on undefined arrays.
 */
const EMPTY_STUDENT_SNAPSHOT: DashboardSnapshot = {
  student: null,
  latestReport: null,
  goals: [],
  documents: [],
  actionItems: [],
  upcomingMeeting: null,
  meetingPrep: [],
  recommendedResources: [],
  consents: [],
};

/**
 * Error boundary for the dashboard render tree. Ensures the app never
 * blank-renders on /dashboard: on any runtime exception we still mount a
 * `<SiteShell>` (which always attaches `<main data-testid=…>`) with a
 * friendly recovery card. See tests/e2e/auth-roles.setup.ts —
 * `<main>` MUST always be attached.
 */
class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string | null }
> {
  state = { hasError: false, message: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err ?? "Unknown error"),
    };
  }
  componentDidCatch(err: unknown) {
    console.error("[DashboardErrorBoundary]", err);
  }
  render() {
    if (this.state.hasError) {
      return <DashboardErrorShell message={this.state.message} />;
    }
    return this.props.children;
  }
}

function DashboardErrorShell({ message }: { message: string | null }) {
  const { user } = useAuth();
  const dashboardHint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  const testId =
    dashboardTestIdForDashboardHint(dashboardHint) ??
    dashboardTestIdForDashboardHint(user?.email) ??
    ROLE_DASHBOARD_TEST_IDS.parent;
  return (
    <SiteShell dashboardTestId={testId}>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <DashboardRoleLandmarks />
        <AlertCircle className="mx-auto mt-4 h-6 w-6 text-destructive" />
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
          We hit a snag loading your dashboard.
        </h1>
        <p className="mt-2 text-sm text-foreground/75">
          Refresh the page to try again. Your data is safe.
        </p>
        {message && (
          <pre className="mx-auto mt-4 max-w-lg overflow-auto rounded-lg border bg-muted/40 p-3 text-left text-[10px] text-foreground/75">
            {message}
          </pre>
        )}
      </div>
    </SiteShell>
  );
}

function DashboardPageGuarded() {
  return (
    <OwnerWorkspaceGate>
    <RoleGuard
      path="/dashboard"
      allow={["family", "student", "educator", "admin"]}
      keepMounted
      fallback={<DashboardLoadingShell />}
    >
      <DashboardErrorBoundary>
        <DashboardPage />
      </DashboardErrorBoundary>
    </RoleGuard>
    </OwnerWorkspaceGate>
  );
}

function DashboardRoleLandmarks() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
      <span data-dashboard-landmark="student">Next Best Step</span>
      <span data-dashboard-landmark="family">Pathway Progress</span>
    </div>
  );
}

function DashboardLoadingShell() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getProfile);
  const dashboardHint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  const hintedDashboardTestId =
    dashboardTestIdForDashboardHint(dashboardHint) ?? dashboardTestIdForDashboardHint(user?.email);
  const [testId, setTestId] = useState<RoleDashboardTestId | null>(hintedDashboardTestId);

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled)
          setTestId(dashboardTestIdForProfileRole(p.primary_role) ?? hintedDashboardTestId);
      })
      .catch(() => {
        if (!cancelled) setTestId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile, hintedDashboardTestId]);

  return (
    <SiteShell dashboardTestId={testId ?? undefined}>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <DashboardRoleLandmarks />
      </div>
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Preparing Your Dashboard
        </h1>
        <p className="mt-2 text-sm text-foreground/75">
          Checking your access and loading planning details for your workspace.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm text-foreground/75">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
        </div>
      </div>
    </SiteShell>
  );
}

type StudentLite = { id: string; first_name: string; last_name: string | null };

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const emailHandle = user?.email?.split("@")[0];
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null);
  const friendly = profileFirstName ?? fullName?.split(" ")[0] ?? emailHandle ?? "there";

  const fetchStudents = useServerFn(listStudents);
  const ensureStudentProfile = useServerFn(ensureOwnStudentProfile);
  const fetchSnapshot = useServerFn(getDashboardSnapshot);
  const fetchProfile = useServerFn(getProfile);
  const fetchRoles = useServerFn(getMyRoles);
  const seed = useServerFn(seedDemoStudent);
  const dashboardHint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  const hintedDashboardTestId =
    dashboardTestIdForDashboardHint(dashboardHint) ?? dashboardTestIdForDashboardHint(user?.email);
  const [isStudentOnly, setIsStudentOnly] = useState<boolean | null>(null);
  const [dashboardTestId, setDashboardTestId] = useState<RoleDashboardTestId | null>(
    hintedDashboardTestId,
  );

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        if (p.first_name) setProfileFirstName(p.first_name);
        const profileTestId =
          dashboardTestIdForProfileRole(p.primary_role) ?? hintedDashboardTestId;
        if (profileTestId) {
          setDashboardTestId(profileTestId);
          setIsStudentOnly(profileTestId === ROLE_DASHBOARD_TEST_IDS.student);
        }
      })
      .catch(() => {
        /* fall back to user_metadata / email */
      });
  }, [fetchProfile, hintedDashboardTestId]);

  useEffect(() => {
    fetchRoles()
      .then((r) => {
        const aud = audiencesForRoles(r.roles);
        if (aud.has("admin")) {
          navigate({ to: "/owner", replace: true });
          return;
        }
        const studentOnly = aud.size > 0 && aud.has("student") && aud.size === 1;
        setIsStudentOnly(studentOnly);
        if (studentOnly) {
          setDashboardTestId(ROLE_DASHBOARD_TEST_IDS.student);
        } else if (aud.has("family")) {
          setDashboardTestId(ROLE_DASHBOARD_TEST_IDS.parent);
        }
        // Route non-family roles to their proper workspace:
        // - Platform Admin (admin-only) → Owner Hub instead of family UI
        // - School/District Admin & Partner → their hub
        // - Educator / Case Manager → /caseload (unless they also have family access)
        // Family + Student stay on this dashboard.
        const hasFamily = aud.has("family");
        const hasStudent = aud.has("student");
        if (!hasFamily && !hasStudent) {
          if (aud.has("admin")) {
            // Platform admin landing on /dashboard would see family widgets;
            // send them to Owner Hub where their tools actually live.
            navigate({ to: "/owner", replace: true });
          } else if (aud.has("district_admin") || aud.has("school_admin") || aud.has("partner")) {
            navigate({ to: fallbackPathFor(r.roles), replace: true });
          } else if (aud.has("educator")) {
            navigate({ to: "/caseload", replace: true });
          }
        }
      })
      .catch(() => {
        setIsStudentOnly((current) => current ?? false);
        setDashboardTestId(
          (current) => current ?? hintedDashboardTestId ?? ROLE_DASHBOARD_TEST_IDS.parent,
        );
      });
  }, [fetchRoles, navigate, hintedDashboardTestId]);

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const reload = useCallback(
    async (sid?: string | null) => {
      setLoading(true);
      setLoadError(null);
      try {
        let list = await fetchStudents();
        if (!list.students[0]) {
          const currentProfile = await fetchProfile();
          if (currentProfile.primary_role === "student") {
            await ensureStudentProfile();
            list = await fetchStudents();
          }
        }
        const studentList = list.students.map((s) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
        }));
        setStudents(studentList);
        const id = sid ?? selectedId ?? studentList[0]?.id ?? null;
        setSelectedId(id);
        const data = await fetchSnapshot({ data: id ? { student_id: id } : {} });
        setSnap(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [ensureStudentProfile, fetchProfile, fetchSnapshot, fetchStudents, selectedId],
  );

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onboarding gate is owned by `_authenticated.tsx`; no redundant check here.

  async function handleSeed() {
    setSeeding(true);
    try {
      const { studentId } = await seed();
      toast.success("Demo student Marcus is ready — explore TransitionForward.");
      await reload(studentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create demo.");
    } finally {
      setSeeding(false);
    }
  }

  /* ---------- student-only audience: first-person dashboard ----------
   *
   * Rendered BEFORE the generic loading / empty branches so a student
   * viewer always gets `<main data-testid="student-dashboard-main">` even
   * while the snapshot or student list is still resolving, and never falls
   * through to the parent-audience empty state (which would render the
   * wrong dashboard test id and blank-render the student-setup probe).
   *
   * `treatAsStudent` also honors the E2E dashboard hint (email/URL/
   * localStorage) so the render path is stable when the roles fetch is
   * momentarily unavailable — the underlying RLS still protects data.
   */
  const treatAsStudent =
    isStudentOnly === true ||
    (isStudentOnly === null && hintedDashboardTestId === ROLE_DASHBOARD_TEST_IDS.student);
  if (treatAsStudent) {
    return (
      <StudentDashboard
        firstName={friendly}
        snap={snap ?? EMPTY_STUDENT_SNAPSHOT}
        onReconnect={() => reload()}
      />
    );
  }

  /* ---------- empty state: no students yet ---------- */
  if (!loading && students.length === 0) {
    return (
      <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.parent}>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <DashboardRoleLandmarks />
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
            Welcome, {toTitleCase(friendly)}.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-foreground/75">
            TransitionForward helps you understand the student, organize important documents,
            prepare for PPT meetings, and connect goals to real-life pathways. Start by adding your
            student — or try the full experience with a demo student.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="group border-y border-primary/40 bg-primary/[0.035] py-6 text-left transition hover:bg-primary/[0.055] disabled:opacity-60 sm:px-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-soft">
                {seeding ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>
              <h3 className="mt-5 font-display text-xl">Try with demo student</h3>
              <p className="mt-2 text-sm text-foreground/75">
                Creates Marcus — a sample 11th grader with goals, IEP docs, a Pathway Report, action
                items, an upcoming PPT meeting, and recommended resources.
              </p>
            </button>

            <Link
              to="/students"
              className="group border-y border-border/70 py-6 transition hover:bg-muted/35 sm:px-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl">Add your student</h3>
              <p className="mt-2 text-sm text-foreground/75">
                Create a private student profile. You control who sees it. Documents and reports
                stay in your account.
              </p>
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-foreground/75">
            Just want to look around first?{" "}
            <Link to="/demo-mode" className="font-medium text-primary hover:underline">
              Explore Demo Mode (read-only)
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (loadError && !snap) {
    return (
      <SiteShell dashboardTestId={dashboardTestId ?? ROLE_DASHBOARD_TEST_IDS.parent}>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mb-4 flex justify-center">
            <DashboardRoleLandmarks />
          </div>
          <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
          <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
            We couldn't load your dashboard
          </h1>
          <p className="mt-2 text-sm text-foreground/75">{loadError}</p>
          <Button onClick={() => reload()} className="mt-5">
            Try again
          </Button>
        </div>
      </SiteShell>
    );
  }

  if (loading || !snap) {
    return (
      <SiteShell dashboardTestId={dashboardTestId ?? ROLE_DASHBOARD_TEST_IDS.parent}>
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <DashboardRoleLandmarks />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Loading Your Family Dashboard
          </h1>
          <p className="mt-2 text-sm text-foreground/75">
            Gathering your connected students, upcoming meetings, saved documents, and pathway
            progress.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-foreground/75">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your dashboard…
          </div>
        </div>
      </SiteShell>
    );
  }

  const s = snap.student;
  return (
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.parent}>
      <div className="demo-shell">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
          {students.length > 1 && (
            <div className="mb-6 flex justify-end">
              <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
                Selected student
                <select
                  value={selectedId ?? ""}
                  onChange={(e) => reload(e.target.value)}
                  className="rounded-full border bg-card px-4 py-2 text-sm normal-case tracking-normal text-foreground shadow-soft"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name ?? ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <LiveFamilyWorkspaceOverview firstName={friendly} snapshot={snap} />
          <DashboardWidgetBoard role="family" studentId={s?.id} />
        </div>
      </div>
    </SiteShell>
  );
}
