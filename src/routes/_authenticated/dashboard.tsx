import { getStudentHubContext } from "@/lib/dashboard/student-hub-context.functions";
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Component, useCallback, useEffect, useState, useRef, type ReactNode } from "react";
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
  const { user, loading } = useAuth();
  if (loading || !user)
    return (
      <SiteShell>
        <p role="status" className="p-8">
          Opening Your Workspace…
        </p>
      </SiteShell>
    );
  return <DashboardPageForViewer key={user.id} user={user} />;
}

function DashboardPageForViewer({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const navigate = useNavigate();
  const alive = useRef(false);
  const requestVersion = useRef(0);
  const selection = useRef<string | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      requestVersion.current += 1;
    };
  }, []);
  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const emailHandle = user?.email?.split("@")[0];
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null);
  const friendly = profileFirstName ?? fullName?.split(" ")[0] ?? emailHandle ?? "there";

  const fetchStudents = useServerFn(listStudents);
  const ensureStudentProfile = useServerFn(ensureOwnStudentProfile);
  const fetchSnapshot = useServerFn(getDashboardSnapshot);
  const fetchProfile = useServerFn(getProfile);
  const fetchRoles = useServerFn(getMyRoles);
  const fetchStudentContext = useServerFn(getStudentHubContext);
  const seed = useServerFn(seedDemoStudent);
  const dashboardHint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  const hintedDashboardTestId =
    dashboardTestIdForDashboardHint(dashboardHint) ?? dashboardTestIdForDashboardHint(user?.email);
  const [roleDecision, setRoleDecision] = useState<"student" | "family" | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleRetry, setRoleRetry] = useState(0);
  const isStudentOnly = roleDecision === null ? null : roleDecision === "student";
  const dashboardTestId =
    roleDecision === "student"
      ? ROLE_DASHBOARD_TEST_IDS.student
      : roleDecision === "family"
        ? ROLE_DASHBOARD_TEST_IDS.parent
        : hintedDashboardTestId;

  useEffect(() => {
    let active = true;
    fetchProfile({ data: { expected_viewer_id: user.id } })
      .then((p) => {
        if (!active || p.id !== user.id) return;
        if (p.first_name) setProfileFirstName(p.first_name);
      })
      .catch(() => {
        /* fall back to user_metadata / email */
      });
    return () => {
      active = false;
    };
  }, [fetchProfile, hintedDashboardTestId, user.id]);

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setRoleDecision(null);
    setRoleError(null);
    fetchRoles({ data: { expected_viewer_id: user.id } })
      .then((r) => {
        if (!active) return;
        const aud = audiencesForRoles(r.roles);
        if (aud.has("admin")) {
          void navigate({ to: "/owner", replace: true });
          return;
        }
        if (aud.has("family")) {
          setRoleDecision("family");
          return;
        }
        if (aud.has("student")) {
          setRoleDecision("student");
          return;
        }
        if (
          aud.has("district_admin") ||
          aud.has("school_admin") ||
          aud.has("partner") ||
          aud.has("educator")
        ) {
          void navigate({ to: fallbackPathFor(r.roles), replace: true });
          return;
        }
        throw new Error("Your dashboard access could not be confirmed. Please try again.");
      })
      .catch(() => {
        if (active) setRoleError("Your dashboard access could not be confirmed. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [fetchRoles, navigate, user.id, roleRetry]);

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const reload = useCallback(
    async (sid?: string | null) => {
      if (!roleDecision) return;
      const version = ++requestVersion.current;
      const current = () => alive.current && requestVersion.current === version;
      if (sid !== undefined) selection.current = sid;
      const requested = selection.current;
      setSelectedId(requested);
      setLoading(true);
      setLoadError(null);
      setSnap(null);
      try {
        if (roleDecision === "student") {
          let linked = await fetchStudentContext({ data: { expected_viewer_id: user.id } });
          if (!current()) return;
          const confirmLink = () => {
            if (linked.viewer_id !== user.id)
              throw new Error("Your sign-in changed. Please try again.");
            if (linked.management_only) {
              setRoleDecision(null);
              void navigate({ to: "/owner", replace: true });
              throw new Error("Opening your Owner Hub.");
            }
            if (linked.connection_status === "ambiguous")
              throw new Error(
                "More than one student profile is connected to your account. Ask your team to confirm the correct connection.",
              );
          };
          confirmLink();
          if (linked.connection_status === "missing" && !requested) {
            await ensureStudentProfile({ data: { expected_viewer_id: user.id } });
            if (!current()) return;
            linked = await fetchStudentContext({ data: { expected_viewer_id: user.id } });
            if (!current()) return;
            confirmLink();
          }
          const id = linked.connection_status === "ready" ? linked.student_id : null;
          if (requested && id !== requested)
            throw new Error(
              "Your previous student connection is unavailable. Ask your team to confirm it, then try again.",
            );
          if (!id) {
            setSnap(EMPTY_STUDENT_SNAPSHOT);
            return;
          }
          selection.current = id;
          setSelectedId(id);
          const data = await fetchSnapshot({
            data: { student_id: id, expected_viewer_id: user.id },
          });
          if (!current()) return;
          if (data.student?.id !== id)
            throw new Error("The selected student could not be confirmed. Please try again.");
          setSnap(data);
          return;
        }
        const list = await fetchStudents({ data: { expected_viewer_id: user.id } });
        if (!current()) return;
        if (list.loadFailed)
          throw new Error("Your student list could not be loaded. Please try again.");
        const studentList = list.students.map((s) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
        }));
        setStudents(studentList);
        if (requested && !studentList.some((student) => student.id === requested))
          throw new Error(
            "The selected student is unavailable. Choose an available student or try again.",
          );
        const id = requested ?? studentList[0]?.id ?? null;
        selection.current = id;
        setSelectedId(id);
        if (!id) {
          setSnap(EMPTY_STUDENT_SNAPSHOT);
          return;
        }
        const data = await fetchSnapshot({ data: { student_id: id, expected_viewer_id: user.id } });
        if (!current()) return;
        if (data.student?.id !== id)
          throw new Error("The selected student could not be confirmed. Please try again.");
        setSnap(data);
      } catch (err) {
        if (current())
          setLoadError(err instanceof Error ? err.message : "Could not load your dashboard.");
      } finally {
        if (current()) setLoading(false);
      }
    },
    [
      ensureStudentProfile,
      fetchStudentContext,
      fetchSnapshot,
      fetchStudents,
      user.id,
      roleDecision,
      navigate,
    ],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  // Onboarding gate is owned by `_authenticated.tsx`; no redundant check here.

  async function handleSeed() {
    if (!alive.current || seeding || roleDecision !== "family") return;
    setSeeding(true);
    try {
      const { studentId } = await seed({ data: { expected_viewer_id: user.id } });
      if (!alive.current) return;
      toast.success("Demo student Marcus is ready — explore TransitionForward.");
      await reload(studentId);
    } catch (err) {
      if (alive.current) toast.error(err instanceof Error ? err.message : "Could not create demo.");
    } finally {
      if (alive.current) setSeeding(false);
    }
  }

  const studentSelector =
    students.length > 1 || (loadError && students.length > 0) ? (
      <div className="mb-6 flex justify-end">
        <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
          Selected Student
          <select
            aria-label={loadError ? "Choose a Student" : "Selected Student"}
            value={selectedId ?? ""}
            onChange={(event) => void reload(event.target.value)}
            className="rounded-full border bg-card px-4 py-2 text-sm normal-case tracking-normal text-foreground shadow-soft"
          >
            {selectedId && !students.some((student) => student.id === selectedId) && (
              <option value={selectedId}>Previously Selected Student</option>
            )}
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name ?? ""}
              </option>
            ))}
          </select>
        </label>
      </div>
    ) : null;

  // Hints only keep the loading landmark stable; they never choose an audience or student.
  if (!roleDecision) {
    const studentLoadingHint = hintedDashboardTestId === ROLE_DASHBOARD_TEST_IDS.student;
    return (
      <SiteShell dashboardTestId={studentLoadingHint ? ROLE_DASHBOARD_TEST_IDS.student : undefined}>
        <div
          className="mx-auto max-w-3xl px-4 py-16 text-center"
          role={roleError ? "alert" : "status"}
        >
          <h1 className="font-display text-2xl">
            {roleError ? "We Could Not Confirm Your Workspace" : "Checking Your Workspace Access"}
          </h1>
          {roleError && (
            <>
              <p className="mt-3 text-sm">{roleError}</p>
              <Button className="mt-4" onClick={() => setRoleRetry((value) => value + 1)}>
                Try Again
              </Button>
            </>
          )}
        </div>
      </SiteShell>
    );
  }

  const treatAsStudent = isStudentOnly === true;
  if (treatAsStudent) {
    return (
      <StudentDashboard
        firstName={friendly}
        snap={snap ?? EMPTY_STUDENT_SNAPSHOT}
        loading={loading}
        error={loadError}
        onReconnect={() => reload()}
      />
    );
  }

  /* ---------- empty state: no students yet ---------- */
  if (!loading && !loadError && students.length === 0) {
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

  if (loadError) {
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
          {studentSelector}
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
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">{studentSelector}</div>
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
          {studentSelector}

          <LiveFamilyWorkspaceOverview firstName={friendly} snapshot={snap} />
          <DashboardWidgetBoard role="family" studentId={s?.id} />
        </div>
      </div>
    </SiteShell>
  );
}
