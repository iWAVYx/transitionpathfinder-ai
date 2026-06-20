import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { WelcomeBanner } from "@/components/site/WelcomeBanner";
import { AnnouncementsBanner } from "@/components/site/AnnouncementsBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toTitleCase } from "@/lib/title-case";
import {
  getDashboardSnapshot,
  seedDemoStudent,
  setActionItemStatus,
  recordConsent,
  type DashboardSnapshot,
  type ActionItemRow,
} from "@/lib/golden-path.functions";
import { listStudents, createShareToken } from "@/lib/students.functions";
import { getProfile, getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles, fallbackPathFor } from "@/lib/role-policy";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { InvitesInbox } from "@/components/dashboard/InvitesInbox";
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


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Your dashboard — TransitionForward" }],
  }),
  component: DashboardPageGuarded,
});

function DashboardPageGuarded() {
  return (
    <RoleGuard path="/dashboard" allow={["family", "student", "educator", "admin"]}>
      <DashboardPage />
    </RoleGuard>
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
  const consent = useServerFn(recordConsent);
  const shareReport = useServerFn(createShareToken);
  const [sharing, setSharing] = useState(false);
  const [isStudentOnly, setIsStudentOnly] = useState<boolean | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        if (p.first_name) setProfileFirstName(p.first_name);
      })
      .catch(() => {
        /* fall back to user_metadata / email */
      });
  }, [fetchProfile]);

  useEffect(() => {
    fetchRoles()
      .then((r) => {
        const aud = audiencesForRoles(r.roles);
        setIsStudentOnly(aud.size > 0 && aud.has("student") && aud.size === 1);
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
      .catch(() => setIsStudentOnly(false));
  }, [fetchRoles, navigate]);


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

  /* ---------- student-only audience: first-person dashboard ---------- */
  if (isStudentOnly === true && !loading && snap) {
    return (
      <StudentDashboard firstName={friendly} snap={snap} onToggleAction={toggleAction} />
    );
  }

  /* ---------- empty state: no students yet ---------- */
  if (!loading && students.length === 0) {
    // Student-only audience: show the student waiting-for-invite empty state.
    if (isStudentOnly === true) {
      return (
        <StudentDashboard
          firstName={friendly}
          snap={{
            student: null,
            latestReport: null,
            goals: [],
            documents: [],
            actionItems: [],
            upcomingMeeting: null,
            consents: [],
          } as unknown as DashboardSnapshot}
          onToggleAction={() => {}}
        />
      );
    }
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            data-dashboard-landmark="family"
          >
            Pathway Progress
          </p>
          <Breadcrumbs trail={[{ label: "Dashboard" }]} />
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
              onClick={handleSeed}
              disabled={seeding}
              className="group rounded-3xl border-2 border-primary/40 bg-gradient-hero p-7 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60"
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
              className="group rounded-3xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
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
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span data-dashboard-landmark="student">Next Best Step</span>
            <span data-dashboard-landmark="family">Pathway Progress</span>
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
      <SiteShell>
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span data-dashboard-landmark="student">Next Best Step</span>
            <span data-dashboard-landmark="family">Pathway Progress</span>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" /> Loading your dashboard…
        </div>
      </SiteShell>
    );
  }

  const s = snap.student;
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Dashboard" }]} />

        <div className="mt-4">
          <AnnouncementsBanner />
          <WelcomeBanner firstName={friendly} />
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
          <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6 lg:p-8">
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
                    <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
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

          {/* Pathway Report Panel */}
          <div className="mt-6 rounded-3xl border bg-gradient-hero p-5 shadow-soft sm:p-6 lg:p-8">
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
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
                >
                  <Sparkles className="h-4 w-4" />
                  {snap.latestReport ? "Update report" : "Generate report"}
                </Link>
                {snap.latestReport && (
                  <>
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: snap.latestReport.id }}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" /> Open
                    </Link>
                    <button
                      onClick={() => handleDownloadPdf(snap.latestReport!.id)}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                      disabled={sharing}
                      onClick={() => handleCopyShare(snap.latestReport!.id, "family")}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      <Share2 className="h-4 w-4" /> Copy family link
                    </button>
                    <button
                      disabled={sharing}
                      onClick={() => handleCopyShare(snap.latestReport!.id, "educator")}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
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
                <EmptyMini label="No documents yet. Upload the current IEP to get started." />
              ) : (
                <ul className="divide-y rounded-xl border bg-background">
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
                <EmptyMini label="No action items yet. Generate a Pathway Report to populate." />
              ) : (
                <ul className="space-y-2">
                  {snap.actionItems.slice(0, 7).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 rounded-xl border bg-background p-3"
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
              title={snap.upcomingMeeting ? "Next meeting" : "Meeting prep"}
              subtitle={
                snap.upcomingMeeting?.scheduled_at
                  ? `${snap.upcomingMeeting.kind} · ${new Date(snap.upcomingMeeting.scheduled_at).toLocaleDateString()}`
                  : "Prepare for the next PPT/IEP"
              }
              icon={<Calendar className="h-5 w-5" />}
              actionHref="/meetings"
              actionLabel="All meetings"
            >
              {!snap.upcomingMeeting ? (
                <EmptyMini label="No meeting scheduled. Add one to start prep." />
              ) : (
                <>
                  <p className="mb-3 text-sm text-foreground">
                    <span className="font-semibold">{snap.upcomingMeeting.title}</span>
                    {snap.upcomingMeeting.location ? ` · ${snap.upcomingMeeting.location}` : ""}
                  </p>
                  {snap.meetingPrep.length === 0 ? (
                    <EmptyMini label="Prep checklist is empty." />
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
                                  <Circle className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span>{p.content}</span>
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
              title="Recommended resources"
              subtitle={`Personalized for ${s.first_name}`}
              icon={<GraduationCap className="h-5 w-5" />}
              actionHref="/resources"
              actionLabel="Browse all"
            >
              {snap.recommendedResources.length === 0 ? (
                <EmptyMini label="No resources yet." />
              ) : (
                <ul className="space-y-2">
                  {snap.recommendedResources.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border bg-background p-3"
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
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Privacy & Consent */}
          <div className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
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

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/40 p-4">
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
            <QuickLink to="/pathway" icon={<Sparkles className="h-5 w-5" />} title="Pathway tool" body="Generate or update the report." />
            <QuickLink to="/ppt-prep" icon={<ClipboardList className="h-5 w-5" />} title="PPT prep" body="Calm one-page agenda + questions." />
            <QuickLink to="/goals" icon={<Target className="h-5 w-5" />} title="Goals" body="Track progress over time." />
            {s.grade_band === "6-8" ? (
              <QuickLink
                to="/bridgeforward"
                icon={<GraduationCap className="h-5 w-5" />}
                title="BridgeForward"
                body="Plan the move from middle to high school."
              />
            ) : s.grade_band === "9-10" || s.grade_band === "11-12" ? (
              <QuickLink
                to="/opportunities"
                icon={<GraduationCap className="h-5 w-5" />}
                title="Opportunities"
                body="Internships, jobs, and partner programs."
              />
            ) : (
              <QuickLink
                to="/resources"
                icon={<GraduationCap className="h-5 w-5" />}
                title="Resources"
                body="Curated supports for your family."
              />
            )}
          </div>
        </section>
      )}
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
    <div className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="font-display text-xl font-medium tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actionHref && actionLabel && (
          <Link
            to={actionHref as never}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {actionLabel} →
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      {label}
    </p>
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
    <div className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      {granted ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
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
      className="group rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-sky text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-lg">{title} →</h3>
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
    <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
