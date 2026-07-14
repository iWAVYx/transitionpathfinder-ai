import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";

import { toast } from "sonner";
import {
  Sparkles,
  ClipboardList,
  Target,
  FolderOpen,
  Calendar,
  CheckCircle2,
  Circle,
  PlayCircle,
  AlertCircle,
  Shield,
  ExternalLink,
  Plus,
  Loader2,
  Download,
  Share2,
  FileText,
  GraduationCap,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { IllustratedEmptyState, type EmptyKind } from "@/components/empty/IllustratedEmptyState";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { WelcomeBanner } from "@/components/site/WelcomeBanner";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";
import { AnnouncementsBanner } from "@/components/site/AnnouncementsBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toTitleCase } from "@/lib/title-case";
import {
  getDashboardSnapshot,
  seedDemoStudent,
  setActionItemStatus,
  setMeetingPrepCompleted,
  toggleSavedResource,
  recordConsent,
  type DashboardSnapshot,
  type ActionItemRow,
} from "@/lib/golden-path.functions";
import { listStudents, createShareToken } from "@/lib/students.functions";
import { getProfile, getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles, fallbackPathFor } from "@/lib/role-policy";
import {
  ROLE_DASHBOARD_TEST_IDS,
  dashboardTestIdForDashboardHint,
  dashboardTestIdForProfileRole,
  type RoleDashboardTestId,
} from "@/lib/dashboard-testids";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { InvitesInbox } from "@/components/dashboard/InvitesInbox";
import { InvitePeopleCard } from "@/components/dashboard/InvitePeopleCard";
import { ReadinessInsightsCard } from "@/components/students/ReadinessInsightsCard";
import { RoleGuard } from "@/components/RoleGuard";
import { JourneyStrip } from "@/components/dashboard/JourneyStrip";
import { AccessPendingCard } from "@/components/access/AccessPendingCard";
import { useEntitlement } from "@/hooks/use-entitlement";

function EntitlementGate() {
  const { isActive, loading } = useEntitlement();
  if (loading || isActive) return null;
  return (
    <div className="mb-4">
      <AccessPendingCard />
    </div>
  );
}


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
        <p className="mt-2 text-sm text-muted-foreground">
          Refresh the page to try again. Your data is safe.
        </p>
        {message && (
          <pre className="mx-auto mt-4 max-w-lg overflow-auto rounded-lg border bg-muted/40 p-3 text-left text-[10px] text-muted-foreground">
            {message}
          </pre>
        )}
      </div>
    </SiteShell>
  );
}

function DashboardPageGuarded() {
  return (
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
    dashboardTestIdForDashboardHint(dashboardHint) ??
    dashboardTestIdForDashboardHint(user?.email);
  const [testId, setTestId] = useState<RoleDashboardTestId | null>(
    hintedDashboardTestId,
  );

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled) setTestId(dashboardTestIdForProfileRole(p.primary_role) ?? hintedDashboardTestId);
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
        <p className="mt-2 text-sm text-muted-foreground">
          Checking your access and loading planning details for your workspace.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
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
  const friendly =
    profileFirstName ?? fullName?.split(" ")[0] ?? emailHandle ?? "there";

  const fetchStudents = useServerFn(listStudents);
  const fetchSnapshot = useServerFn(getDashboardSnapshot);
  const fetchProfile = useServerFn(getProfile);
  const fetchRoles = useServerFn(getMyRoles);
  const seed = useServerFn(seedDemoStudent);
  const setActionStatus = useServerFn(setActionItemStatus);
  const setPrepDone = useServerFn(setMeetingPrepCompleted);
  const toggleSaved = useServerFn(toggleSavedResource);
  const consent = useServerFn(recordConsent);
  const shareReport = useServerFn(createShareToken);
  const [sharing, setSharing] = useState(false);
  const dashboardHint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  const hintedDashboardTestId =
    dashboardTestIdForDashboardHint(dashboardHint) ??
    dashboardTestIdForDashboardHint(user?.email);
  const [isStudentOnly, setIsStudentOnly] = useState<boolean | null>(null);
  const [dashboardTestId, setDashboardTestId] = useState<RoleDashboardTestId | null>(hintedDashboardTestId);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        if (p.first_name) setProfileFirstName(p.first_name);
        const profileTestId = dashboardTestIdForProfileRole(p.primary_role) ?? hintedDashboardTestId;
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
        setDashboardTestId((current) => current ?? hintedDashboardTestId ?? ROLE_DASHBOARD_TEST_IDS.parent);
      });
  }, [fetchRoles, navigate, hintedDashboardTestId]);


  const handleDownloadPdf = useCallback((reportId: string) => {
    window.open(`/reports/${reportId}?print=1`, "_blank", "noopener");
  }, []);

  const handleCopyShare = useCallback(
    async (reportId: string, audience: "family" | "educator") => {
      setSharing(true);
      try {
        const row = await shareReport({
          data: { report_id: reportId, audience, expires_in_days: 30 },
        });
        const url = `${window.location.origin}/share/${row.token}`;
        await navigator.clipboard.writeText(url);
        toast.success(`${audience === "family" ? "Family" : "Educator"} share link copied — expires in 30 days.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create share link.");
      } finally {
        setSharing(false);
      }
    },
    [shareReport],
  );

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
        const list = await fetchStudents();
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
    [fetchSnapshot, fetchStudents, selectedId],
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

  async function toggleAction(item: ActionItemRow) {
    const next: ActionItemRow["status"] =
      item.status === "complete"
        ? "not_started"
        : item.status === "not_started"
          ? "in_progress"
          : "complete";
    try {
      await setActionStatus({ data: { id: item.id, status: next } });
      setSnap((s) =>
        s
          ? {
              ...s,
              actionItems: s.actionItems.map((a) =>
                a.id === item.id ? { ...a, status: next } : a,
              ),
            }
          : s,
      );
    } catch {
      toast.error("Could not update.");
    }
  }

  async function togglePrepDone(item: { id: string; completed: boolean }) {
    const next = !item.completed;
    setSnap((s) =>
      s ? { ...s, meetingPrep: s.meetingPrep.map((p) => (p.id === item.id ? { ...p, completed: next } : p)) } : s,
    );
    try {
      await setPrepDone({ data: { id: item.id, completed: next } });
    } catch {
      toast.error("Could not update prep item.");
      setSnap((s) =>
        s ? { ...s, meetingPrep: s.meetingPrep.map((p) => (p.id === item.id ? { ...p, completed: item.completed } : p)) } : s,
      );
    }
  }

  async function toggleResourceSaved(resourceId: string, currentlySaved: boolean) {
    const next = !currentlySaved;
    setSnap((s) =>
      s
        ? { ...s, recommendedResources: s.recommendedResources.map((r) => (r.id === resourceId ? { ...r, saved: next } : r)) }
        : s,
    );
    try {
      await toggleSaved({ data: { resource_id: resourceId, saved: next } });
      toast.success(next ? "Saved to your resources." : "Removed from saved.");
    } catch {
      toast.error("Could not update saved resources.");
      setSnap((s) =>
        s
          ? { ...s, recommendedResources: s.recommendedResources.map((r) => (r.id === resourceId ? { ...r, saved: currentlySaved } : r)) }
          : s,
      );
    }
  }

  async function grantConsent(
    type: "ai_processing" | "team_sharing" | "report_sharing" | "document_storage",
    text: string,
  ) {
    if (!snap?.student) return;
    try {
      await consent({
        data: {
          student_id: snap.student.id,
          consent_type: type,
          consent_text_snapshot: text,
        },
      });
      toast.success("Consent recorded.");
      await reload(snap.student.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record consent.");
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
    (isStudentOnly === null &&
      hintedDashboardTestId === ROLE_DASHBOARD_TEST_IDS.student);
  if (treatAsStudent) {
    return (
      <StudentDashboard
        firstName={friendly}
        snap={snap ?? EMPTY_STUDENT_SNAPSHOT}
        onToggleAction={snap ? toggleAction : () => {}}
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
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            TransitionForward helps you understand the student, organize important documents,
            prepare for PPT meetings, and connect goals to real-life pathways. Start by adding
            your student — or try the full experience with a demo student.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="group border-y border-primary/40 bg-primary/[0.035] py-6 text-left transition hover:bg-primary/[0.055] disabled:opacity-60 sm:px-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-soft">
                {seeding ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
              </div>
              <h3 className="mt-5 font-display text-xl">
                Try with demo student
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Creates Marcus — a sample 11th grader with goals, IEP docs, a Pathway Report,
                action items, an upcoming PPT meeting, and recommended resources.
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
              <p className="mt-2 text-sm text-muted-foreground">
                Create a private student profile. You control who sees it. Documents and reports
                stay in your account.
              </p>
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
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
          <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">We couldn't load your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={() => reload()} className="mt-5">Try again</Button>
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
          <p className="mt-2 text-sm text-muted-foreground">
            Gathering your connected students, upcoming meetings, saved
            documents, and pathway progress.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
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
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">

        <div className="tf-cover px-6 py-8 sm:px-10 sm:py-10">
          <p
            className="tf-eyebrow"
            data-dashboard-landmark="family"
          >
            Pathway Progress · {toTitleCase(friendly)}'s Workspace
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-medium leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
            Welcome back, {toTitleCase(friendly)}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Everything you need to keep the plan moving — next best step, journey, documents, meetings, and the Pathway Report.
          </p>
        </div>

        

        <div className="mt-4">
          <AnnouncementsBanner />
          <WelcomeBanner firstName={friendly} />
          <RoleValueStrip role="family" className="mt-4" />
        </div>


        <div className="mt-4">
          <InvitesInbox />
          <EntitlementGate />
          <NextBestAction surface="family" />
          <JourneyStrip surface="family" className="mt-4" />
          <OnboardingChecklist surface="family" className="mt-4" />
        </div>

        {/* Header band */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your students</p>
          </div>
          {students.length > 1 && (
            <select
              value={selectedId ?? ""}
              onChange={(e) => reload(e.target.value)}
              className="rounded-full border bg-card px-4 py-2 text-sm shadow-soft"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.first_name} {st.last_name ?? ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {s && (
        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Student Profile Card */}
          <div className="border-y border-border/70 py-5 sm:py-6 lg:py-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-xl font-medium text-primary ring-1 ring-primary/20 sm:h-16 sm:w-16 sm:text-2xl">
                  {s.first_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Student</p>
                  <h2 className="mt-1 truncate font-display text-2xl font-medium tracking-tight sm:text-3xl">
                    {s.preferred_name ?? s.first_name} {s.last_name ?? ""}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.grade_band ?? "Grade not set"}
                    {s.school ? ` · ${s.school}` : ""}
                    {s.expected_graduation_year ? ` · Class of ${s.expected_graduation_year}` : ""}
                  </p>
                  {s.readiness_level && (
                    <span className="mt-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      Readiness: {s.readiness_level}
                    </span>
                  )}
                </div>
              </div>
              <Link
                to="/students/$studentId"
                params={{ studentId: s.id }}
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <span className="hidden sm:inline">Open student hub →</span>
                <span className="sm:hidden">Open →</span>
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ProfileField label="Strengths" value={s.strengths_summary} />
              <ProfileField label="Interests" value={s.interests_summary} />
              <ProfileField label="Support needs" value={s.support_needs_summary} />
              <ProfileField label="Family priorities" value={s.family_priorities} />
            </div>
            {s.student_voice_statement && (
              <blockquote className="mt-5 border-l-4 border-primary/40 bg-primary/5 px-4 py-3 text-sm italic text-foreground/80">
                "{s.student_voice_statement}"
                <span className="ml-2 text-xs not-italic text-muted-foreground">— {s.first_name}</span>
              </blockquote>
            )}
            {s.current_transition_status && (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Status:</span>{" "}
                {s.current_transition_status}
              </p>
            )}
          </div>

          {/* Invite People — co-parent / educator one-click flows */}
          <div className="mt-6">
            <InvitePeopleCard studentId={s.id} studentFirstName={s.first_name} />
          </div>



          {/* Pathway Report Panel */}
          <div className="mt-6 border-y border-primary/25 bg-primary/[0.035] py-5 sm:py-6 lg:py-8">
            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Pathway Report
                </p>
                <h2 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {snap.latestReport ? "Latest report" : "No report yet"}
                </h2>
                {snap.latestReport && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generated {new Date(snap.latestReport.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/pathway"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
                >
                  <Sparkles className="h-4 w-4" />
                  {snap.latestReport ? "Update report" : "Generate report"}
                </Link>
                {snap.latestReport && (
                  <>
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: snap.latestReport.id }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" /> Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(snap.latestReport!.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                      type="button"
                      disabled={sharing}
                      onClick={() => handleCopyShare(snap.latestReport!.id, "family")}
                      className="inline-flex items-center justify-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      <Share2 className="h-4 w-4" /> Copy family link
                    </button>
                    <button
                      type="button"
                      disabled={sharing}
                      onClick={() => handleCopyShare(snap.latestReport!.id, "educator")}
                      className="inline-flex items-center justify-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      <Share2 className="h-4 w-4" /> Copy educator link
                    </button>
                  </>
                )}
              </div>
            </div>

            {snap.latestReport ? (
              <ReportSections content={snap.latestReport.content} />
            ) : (
              <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
                Generate {s.first_name}'s first Pathway Report to see Student Snapshot, SPIN
                analysis, recommended pathways, career matches, readiness scorecard, IEP
                translator, family/teacher action plans, meeting prep, and matched resources.
              </p>
            )}
          </div>

          {/* AI-driven readiness + next steps tailored to this student */}
          <div className="mt-6">
            <ReadinessInsightsCard
              studentId={s.id}
              studentFirstName={s.first_name}
              compact
            />
          </div>


          {/* Two-column: Documents + Action Items */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Document Hub */}
            <Panel
              title="Document Hub"
              subtitle="IEPs, assessments, evaluations — with status."
              icon={<FolderOpen className="h-5 w-5" />}
              actionHref="/documents"
              actionLabel="Manage"
            >
              {snap.documents.length === 0 ? (
                <EmptyMini kind="documents" label="No documents yet. Upload the current IEP to get started." />
              ) : (
                <ul className="divide-y divide-border/60 border-y border-border/70">
                  {snap.documents.slice(0, 6).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {d.doc_type}
                        </p>
                      </div>
                      <DocStatusBadge status={d.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Action Items */}
            <Panel
              title="Action Items"
              subtitle={`${snap.actionItems.filter((a) => a.status !== "complete").length} open`}
              icon={<ClipboardList className="h-5 w-5" />}
              actionHref="/goals"
              actionLabel="View all"
            >
              {snap.actionItems.length === 0 ? (
                <EmptyMini kind="tasks" label="No action items yet. Generate a Pathway Report to populate." />
              ) : (
                <ul className="space-y-2">
                  {snap.actionItems.slice(0, 7).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 border-b border-border/60 py-3 last:border-b-0"
                    >
                      <button
                        onClick={() => toggleAction(a)}
                        className="mt-0.5 shrink-0"
                        aria-label="toggle status"
                      >
                        {a.status === "complete" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : a.status === "in_progress" ? (
                          <PlayCircle className="h-5 w-5 text-primary/70" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            a.status === "complete"
                              ? "text-sm line-through text-muted-foreground"
                              : "text-sm font-medium"
                          }
                        >
                          {a.title}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-0.5">{a.category}</span>
                          <span
                            className={
                              "rounded-full px-2 py-0.5 " +
                              (a.priority === "high"
                                ? "bg-destructive/10 text-destructive"
                                : a.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : "bg-muted")
                            }
                          >
                            {a.priority}
                          </span>
                          {a.due_date && <span>Due {a.due_date}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Calendar — meetings, action items, prep deadlines, team events */}
          <div className="mt-6">
            <DashboardCalendar
              studentId={s.id}
              studentOptions={students.map((st) => ({
                id: st.id,
                name: `${st.first_name}${st.last_name ? ` ${st.last_name}` : ""}`,
              }))}
            />
          </div>


          {/* Meeting Prep + Recommended Resources */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel
              title={snap.upcomingMeeting ? "Next Meeting" : "Meeting Prep"}
              subtitle={
                snap.upcomingMeeting?.scheduled_at
                  ? `${snap.upcomingMeeting.kind} · ${new Date(snap.upcomingMeeting.scheduled_at).toLocaleDateString()}`
                  : "Get ready for the next PPT with a calm, one-page agenda."
              }
              icon={<Calendar className="h-5 w-5" />}
              actionHref="/meetings"
              actionLabel="All Meetings"
            >
              {!snap.upcomingMeeting ? (
                <EmptyMini kind="meetings" label="No meeting scheduled. Add one to start prep." />
              ) : (
                <>
                  <p className="mb-3 text-sm text-foreground">
                    <span className="font-semibold">{snap.upcomingMeeting.title}</span>
                    {snap.upcomingMeeting.location ? ` · ${snap.upcomingMeeting.location}` : ""}
                  </p>
                  {snap.meetingPrep.length === 0 ? (
                    <EmptyMini kind="tasks" label="Prep checklist is empty." />
                  ) : (
                    <div className="space-y-3">
                      {Array.from(new Set(snap.meetingPrep.map((p) => p.category))).map((cat) => (
                        <div key={cat}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {cat}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {snap.meetingPrep
                              .filter((p) => p.category === cat)
                              .slice(0, 4)
                              .map((p) => (
                                <li key={p.id} className="flex items-start gap-2 text-sm">
                                  <button
                                    type="button"
                                    onClick={() => togglePrepDone(p)}
                                    aria-label={p.completed ? "Mark as not done" : "Mark as done"}
                                    aria-pressed={p.completed}
                                    className="mt-0.5 shrink-0"
                                  >
                                    {p.completed ? (
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                  <span className={p.completed ? "line-through text-muted-foreground" : ""}>
                                    {p.content}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Panel>

            <Panel
              title="Recommended Resources"
              subtitle={`Tuned to ${s.first_name}'s grade, readiness, and priorities.`}
              icon={<GraduationCap className="h-5 w-5" />}
              actionHref="/resources"
              actionLabel="Browse All"
            >
              <div className="mb-2 flex justify-end">
                <Link
                  to="/resources/saved"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Saved →
                </Link>
              </div>
              {snap.recommendedResources.length === 0 ? (
                <EmptyMini kind="resources" label="No resources yet." />
              ) : (
                <ul className="space-y-2">
                  {snap.recommendedResources.map((r) => (
                    <li
                      key={r.id}
                      className="border-b border-border/60 py-3 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{r.title}</p>
                          {r.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {r.description}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-primary">
                            {r.matched_reason}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleResourceSaved(r.id, r.saved)}
                            aria-label={r.saved ? "Remove from saved" : "Save for later"}
                            aria-pressed={r.saved}
                            className={
                              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition " +
                              (r.saved
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:text-primary")
                            }
                          >
                            {r.saved ? "Saved" : "Save"}
                          </button>
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                              aria-label="Open resource in a new tab"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Privacy & Consent */}
          <div className="mt-6 border-y border-border/70 py-5 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  Privacy & consent
                </h2>
                <p className="text-sm text-muted-foreground">
                  You control who sees {s.first_name}'s information.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ConsentRow
                label="AI processing"
                desc="Allow AI to summarize documents and generate planning suggestions."
                granted={snap.consents.some(
                  (c) => c.consent_type === "ai_processing" && c.consent_status === "granted",
                )}
                onGrant={() =>
                  grantConsent(
                    "ai_processing",
                    "I consent to AI-assisted processing of this student's information to generate planning suggestions. AI output is a supportive planning tool and does not replace the school team, professional judgment, legal advice, or official IEP/PPT decisions.",
                  )
                }
              />
              <ConsentRow
                label="Document storage"
                desc="Store IEPs and evaluations privately in your workspace."
                granted={snap.consents.some(
                  (c) => c.consent_type === "document_storage" && c.consent_status === "granted",
                )}
                onGrant={() =>
                  grantConsent(
                    "document_storage",
                    "I consent to storing this student's documents securely in my private workspace.",
                  )
                }
              />
              <ConsentRow
                label="Team sharing"
                desc="Invite educators, case managers, and family with view or edit access."
                granted={snap.consents.some(
                  (c) => c.consent_type === "team_sharing" && c.consent_status === "granted",
                )}
                onGrant={() =>
                  grantConsent(
                    "team_sharing",
                    "I consent to inviting specific collaborators to view or contribute to this student's plan. I can revoke access at any time.",
                  )
                }
              />
              <ConsentRow
                label="Report sharing links"
                desc="Generate revocable share links to send the report to the school team."
                granted={snap.consents.some(
                  (c) => c.consent_type === "report_sharing" && c.consent_status === "granted",
                )}
                onGrant={() =>
                  grantConsent(
                    "report_sharing",
                    "I consent to creating revocable share links for the Pathway Report.",
                  )
                }
              />
            </div>

            <div className="mt-6 flex items-start gap-3 border-t border-dashed border-border/60 bg-muted/30 pt-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                TransitionForward's AI recommendations are supportive planning tools and do{" "}
                <span className="font-semibold">not</span> replace the school team, professional
                judgment, legal advice, or official IEP/PPT decisions. You can revoke any consent
                at any time.
              </p>
            </div>
          </div>

          <div className="mt-10 mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/pathway" icon={<Sparkles className="h-5 w-5" />} title="Pathway Tool" body="Generate or refresh the Pathway Report." />
            <QuickLink to="/ppt-prep" icon={<ClipboardList className="h-5 w-5" />} title="PPT Prep" body="A calm one-page agenda and questions for the team." />
            <QuickLink to="/goals" icon={<Target className="h-5 w-5" />} title="Goals" body="Track progress across every domain over time." />
            {s.grade_band === "6-8" ? (
              <QuickLink
                to="/bridgeforward"
                icon={<GraduationCap className="h-5 w-5" />}
                title="BridgeForward"
                body="Plan the move from middle to high school with confidence."
              />
            ) : s.grade_band === "9-10" || s.grade_band === "11-12" ? (
              <QuickLink
                to="/opportunities"
                icon={<GraduationCap className="h-5 w-5" />}
                title="Opportunities"
                body="Internships, jobs, and partner programs matched to your plan."
              />
            ) : (
              <QuickLink
                to="/resources"
                icon={<GraduationCap className="h-5 w-5" />}
                title="Resources"
                body="Curated supports for your family and student."
              />
            )}
          </div>
        </section>
      )}
      </div>
    </SiteShell>
  );
}


/* ---------- Helpers ---------- */

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground/80">
        {value ?? <span className="italic text-muted-foreground">Not set yet</span>}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="border-y border-border/70 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-medium tracking-tight">{toTitleCase(title)}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actionHref && actionLabel && (
          <Link
            to={actionHref as never}
            className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {toTitleCase(actionLabel)} →
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyMini({ label, kind = "generic" }: { label: string; kind?: EmptyKind }) {
  const [title, ...rest] = label.split(/\.\s+/);
  return (
    <IllustratedEmptyState
      kind={kind}
      size="sm"
      title={title.replace(/\.$/, "")}
      description={rest.join(". ") || undefined}
    />
  );
}


function DocStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    uploaded: "bg-muted text-foreground/70",
    processing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    summarized: "bg-primary/10 text-primary",
    needs_review: "bg-destructive/10 text-destructive",
  };
  const label = status.replace("_", " ");
  return (
    <span
      className={
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider " +
        (styles[status] ?? "bg-muted text-foreground/70")
      }
    >
      {label}
    </span>
  );
}

function ConsentRow({
  label,
  desc,
  granted,
  onGrant,
}: {
  label: string;
  desc: string;
  granted: boolean;
  onGrant: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      {granted ? (
        <span className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <CheckCircle2 className="h-3 w-3" /> Granted
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={onGrant}>
          Grant
        </Button>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to as never}
      hash="quick-link"
      aria-label={`Go to ${title}`}
      className="group border-y border-border/70 py-4 transition hover:bg-muted/35 sm:px-3"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-sky text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-lg">{toTitleCase(title)} →</h3>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </Link>
  );
}

/* ---------- Pathway Report sections preview ---------- */

function ReportSections({ content }: { content: unknown }) {
  const c = (content ?? {}) as Record<string, unknown>;
  const summary = typeof c.summary === "string" ? c.summary : null;
  const snapshot = c.student_snapshot as
    | { readiness_level?: string; primary_interests?: string[]; student_voice_quote?: string }
    | undefined;
  const spin = c.spin_analysis as
    | { strengths?: string[]; needs?: string[]; what_this_means?: string }
    | undefined;
  const pathways = (c.recommended_pathways ?? []) as Array<{
    title: string;
    type?: string;
    why_it_fits?: string;
  }>;
  const careers = (c.career_matches ?? []) as Array<{ cluster: string; next_step?: string }>;
  const readiness = (c.readiness_scorecard ?? []) as Array<{ category: string; level: string }>;
  const iep = (c.iep_translator ?? []) as Array<{ goal_text: string; plain_meaning: string }>;
  const gaps = (c.data_gaps ?? []) as Array<{ item: string }>;
  const family = c.family_action_plan as
    | { this_week?: string[]; this_month?: string[] }
    | undefined;
  const teacher = c.teacher_action_plan as { goal_updates?: string[] } | undefined;
  const prep = c.meeting_prep_toolkit as { questions_to_ask?: string[] } | undefined;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {summary && (
        <SectionCard label="Student Snapshot">
          <p className="text-sm leading-relaxed">{summary}</p>
          {snapshot?.student_voice_quote && (
            <p className="mt-2 text-xs italic text-muted-foreground">
              "{snapshot.student_voice_quote}"
            </p>
          )}
        </SectionCard>
      )}
      {spin && (
        <SectionCard label="Strengths · Preferences · Interests · Needs">
          {spin.strengths && (
            <p className="text-xs"><span className="font-semibold">Strengths:</span> {spin.strengths.slice(0, 3).join(", ")}</p>
          )}
          {spin.needs && (
            <p className="mt-1 text-xs"><span className="font-semibold">Needs:</span> {spin.needs.slice(0, 3).join(", ")}</p>
          )}
          {spin.what_this_means && (
            <p className="mt-2 text-xs italic text-muted-foreground">{spin.what_this_means}</p>
          )}
        </SectionCard>
      )}
      {pathways.length > 0 && (
        <SectionCard label="Recommended Pathways">
          <ul className="space-y-1.5 text-sm">
            {pathways.slice(0, 3).map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{p.title}</span>
                {p.type && <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">{p.type}</span>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {careers.length > 0 && (
        <SectionCard label="Career Matches">
          <ul className="space-y-1 text-sm">
            {careers.slice(0, 4).map((c2, i) => (
              <li key={i}>{c2.cluster}</li>
            ))}
          </ul>
        </SectionCard>
      )}
      {readiness.length > 0 && (
        <SectionCard label="Readiness Scorecard">
          <ul className="space-y-1 text-xs">
            {readiness.slice(0, 6).map((r, i) => (
              <li key={i} className="flex justify-between">
                <span>{r.category}</span>
                <span className="font-semibold text-primary">{r.level}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {iep.length > 0 && (
        <SectionCard label="IEP/Transition Translator">
          <p className="text-xs font-semibold">{iep[0].goal_text}</p>
          <p className="mt-1 text-xs text-muted-foreground">→ {iep[0].plain_meaning}</p>
        </SectionCard>
      )}
      {gaps.length > 0 && (
        <SectionCard label="Missing Information">
          <ul className="space-y-1 text-xs">
            {gaps.slice(0, 3).map((g, i) => (
              <li key={i}>• {g.item}</li>
            ))}
          </ul>
        </SectionCard>
      )}
      {family && (
        <SectionCard label="Family Action Plan">
          {family.this_week && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">This week</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {family.this_week.slice(0, 3).map((x, i) => <li key={i}>• {x}</li>)}
              </ul>
            </>
          )}
        </SectionCard>
      )}
      {teacher?.goal_updates && (
        <SectionCard label="Educator / Case Manager Plan">
          <ul className="space-y-0.5 text-xs">
            {teacher.goal_updates.slice(0, 3).map((x, i) => <li key={i}>• {x}</li>)}
          </ul>
        </SectionCard>
      )}
      {prep?.questions_to_ask && (
        <SectionCard label="Meeting Prep">
          <ul className="space-y-1 text-xs">
            {prep.questions_to_ask.slice(0, 3).map((q, i) => <li key={i}>• {q}</li>)}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-y border-border/60 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
