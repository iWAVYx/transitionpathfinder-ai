import { upcomingRecordedMeeting } from "@/lib/dashboard/recorded-status";
import { studentToolPreviewDetails } from "@/lib/dashboard/tool-preview-details";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  HeartHandshake,
  MessageSquare,
  Mic,
} from "lucide-react";

import {
  LiveToolPreviewDrawer,
  type LiveToolPreview,
} from "@/components/dashboard/LiveToolPreviewDrawer";
import {
  ToolPreviewCard,
  ToolPreviewGrid,
  ToolPreviewSection,
  type ToolPreviewCardProps,
} from "@/components/dashboard/ToolPreviewCard";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/lib/golden-path.functions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getStudentHubContext } from "@/lib/dashboard/student-hub-context.functions";
import { DashboardWidgetBoard } from "./DashboardWidgetBoard";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";

type StudentWorkspaceCard = ToolPreviewCardProps & {
  dataSource: string;
  privacyNote: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date pending"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatGradeBand(value: string | null) {
  return value ? toTitleCase(value.replace(/_/g, " ")) : "Grade not set";
}

/**
 * Demo-shaped Student workspace powered only by the signed-in student's
 * authorized dashboard snapshot. It never imports public demo fixtures.
 */
export function LiveStudentWorkspaceOverview({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [activePreview, setActivePreview] = useState<LiveToolPreview | null>(null);
  const student = snapshot.student;
  if (!student) return null;

  const studentName = [student.preferred_name ?? student.first_name, student.last_name]
    .filter(Boolean)
    .join(" ");
  const activeActions = snapshot.actionItems.filter((item) => item.status !== "complete");
  const completedActions = snapshot.actionItems.length - activeActions.length;
  const activeGoals = snapshot.goals.filter((goal) => goal.status !== "complete").length;
  const observedAt = Date.now();
  const meeting = upcomingRecordedMeeting(snapshot.upcomingMeeting, observedAt);
  const savedResources = snapshot.recommendedResources.filter((resource) => resource.saved).length;
  const meetingDate = formatDate(meeting?.scheduled_at);
  const studentBoundary =
    "Visible only through your signed-in student workspace and the team access already authorized for your plan.";

  const cards: StudentWorkspaceCard[] = [
    {
      icon: FileText,
      title: "My Pathway Report",
      status: snapshot.latestReport ? "Ready to read" : "Not created yet",
      tone: snapshot.latestReport ? "success" : "warning",
      summary:
        "See how your voice, strengths, goals, and evidence connect to realistic next steps.",
      bullets: [
        {
          label: "Last updated",
          value: snapshot.latestReport ? formatDate(snapshot.latestReport.created_at) : "—",
        },
        { label: "Source", value: "Your plan" },
      ],
      cta: snapshot.latestReport
        ? {
            label: "Read My Report",
            to: "/reports/$reportId",
            params: { reportId: snapshot.latestReport.id },
          }
        : { label: "Open My Pathway", to: "/pathway/student" },
      dataSource: "Your latest authorized Pathway Report",
      privacyNote:
        "The preview shows report status only; private report content stays in the full report.",
    },
    {
      icon: Mic,
      title: "Student Voice",
      status: student.student_voice_statement ? "Voice added" : "Ready to start",
      tone: student.student_voice_statement ? "success" : "warning",
      summary:
        "Tell your team what matters to you so your plan sounds like you and reflects your choices.",
      bullets: [
        {
          label: "Voice statement",
          value: student.student_voice_statement ? "Saved" : "Not added",
        },
        { label: "Used in", value: "Your plan" },
      ],
      cta: { label: "Open Student Voice", to: "/student-voice" },
      dataSource: "Your saved Student Voice profile",
      privacyNote: studentBoundary,
    },

    {
      icon: CheckSquare,
      title: "My Next Actions",
      status: `${activeActions.length} open`,
      tone: activeActions.length > 0 ? "warning" : "success",
      summary: "See the small next steps you own and what your team is working on with you.",
      bullets: [
        { label: "Open", value: activeActions.length },
        { label: "Completed", value: completedActions },
      ],
      cta: { label: "Open Action Items", to: "/action-items" },
      dataSource: "Action items authorized for your student plan",
      privacyNote: "Only totals appear in this preview; full task details stay in the tool.",
    },

    {
      icon: CalendarDays,
      title: "Meetings & Prep",
      status: meeting ? meetingDate : "Not scheduled",
      tone: meeting ? "default" : "muted",
      summary: "Know what meeting is next and prepare questions, priorities, and talking points.",
      bullets: [
        { label: "Next meeting", value: meetingDate },
        {
          label: "Prep open",
          value: meeting ? snapshot.meetingPrep.filter((item) => !item.completed).length : 0,
        },
      ],
      cta: { label: "Open My Calendar", to: "/calendar" },
      dataSource: "Your meeting schedule and saved preparation items",
      privacyNote: studentBoundary,
    },
    {
      icon: BookOpen,
      title: "Resources For Me",
      status: `${snapshot.recommendedResources.length} shown`,
      tone: "muted",
      summary:
        "Browse up to six resources. Topic keywords in your saved planning notes help order these suggestions.",
      bullets: [
        { label: "Shown", value: snapshot.recommendedResources.length },
        { label: "Saved In This Preview", value: savedResources },
      ],
      cta: { label: "Open Resources", to: "/resources" },
      dataSource: "A six-item topic-keyword resource preview from your saved planning notes",
      privacyNote: studentBoundary,
    },
    {
      icon: HeartHandshake,
      title: "Partner Network",
      status: "Explore options",
      summary:
        "Find verified programs, enrichment, after-school activities, training, and opportunities.",
      bullets: [
        { label: "Matched by", value: "Goals + interests" },
        { label: "Private files", value: "Never shared" },
      ],
      cta: { label: "Explore Partners", to: "/partner-network" },
      dataSource: "Public partner listings matched to profile themes",
      privacyNote: "Partners cannot see your private documents through this directory preview.",
    },
    {
      icon: MessageSquare,
      title: "Transition Channel",
      status: "Team communication",
      summary: "Keep questions and follow-ups connected to your authorized transition team.",
      bullets: [
        { label: "Context", value: student.first_name },
        { label: "Visibility", value: "Team-scoped" },
      ],
      cta: { label: "Open Channel", to: "/transition-channel" },
      dataSource: "Your role-scoped Transition Channel context",
      privacyNote: "Message contents remain inside the full team-scoped channel.",
    },
  ];

  return (
    <section data-testid="live-student-dashboard-overview">
      <div className="grid gap-8 border-b border-border/70 pb-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Student
            </span>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold text-foreground/75">
              Signed-in workspace
            </span>
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            My Transition Plan
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            My Future, In My Own Voice.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            This uses the same clear structure as the demo, now connected to your real profile,
            saved progress, and the tools you use with your transition team.
          </p>
        </div>

        <aside className="border-l-2 border-primary/35 pl-5" aria-label="Student plan summary">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            My Plan
          </p>
          <p className="mt-3 font-display text-2xl">{studentName}</p>
          <p className="mt-1 text-sm text-foreground/75">
            {formatGradeBand(student.grade_band)} · {student.school ?? "School not set"}
          </p>
          {student.student_voice_statement ? (
            <blockquote className="mt-4 border-l-2 border-primary/60 pl-3 text-sm italic text-foreground/75">
              “{student.student_voice_statement}”
            </blockquote>
          ) : (
            <p className="mt-4 text-sm text-foreground/75">
              Add Student Voice so your plan reflects what you want your team to know.
            </p>
          )}
        </aside>
      </div>

      <dl className="grid border-b border-border/70 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border/70">
        <SummaryItem
          label="Active Goals"
          value={`${activeGoals}`}
          detail={`${snapshot.goals.length} total`}
        />
        <SummaryItem
          label="Pathway Report"
          value={snapshot.latestReport ? "Ready to read" : "Not created yet"}
          detail={
            snapshot.latestReport
              ? `Updated ${formatDate(snapshot.latestReport.created_at)}`
              : "Build the first report"
          }
        />
        <SummaryItem
          label="Next Actions"
          value={`${activeActions.length} open`}
          detail={`${completedActions} completed`}
        />
        <SummaryItem
          label="Next Meeting"
          value={meetingDate}
          detail={meeting?.title ?? "No meeting scheduled"}
        />
      </dl>

      <div data-testid="live-student-workspace-grid">
        <ToolPreviewSection
          eyebrow="My Workspace"
          title="Preview What Matters, Then Open The Full Tool"
          description="Every card reflects your signed-in data or a truthful empty state. Preview gives you the useful at-a-glance view before you open the complete feature."
        >
          <ToolPreviewGrid>
            {cards.map(({ dataSource, privacyNote, ...card }) => (
              <ToolPreviewCard
                key={card.title}
                {...card}
                onPreview={() =>
                  setActivePreview({
                    ...studentToolPreviewDetails(card.cta.to, snapshot),
                    icon: card.icon,
                    title: card.title,
                    summary:
                      card.summary ?? "Open this tool to see the complete signed-in experience.",
                    status: card.status,
                    bullets: card.bullets,
                    cta: card.cta,
                    dataSource,
                    privacyNote,
                  })
                }
              />
            ))}
          </ToolPreviewGrid>
        </ToolPreviewSection>
      </div>

      <LiveToolPreviewDrawer
        preview={activePreview}
        onOpenChange={(open) => {
          if (!open) setActivePreview(null);
        }}
      />
    </section>
  );
}

/** Loads the same protected snapshot when the Student Hub is opened directly. */
export function LiveStudentWorkspaceLoader() {
  const { user, loading } = useAuth();
  const viewerId = user?.id;
  const fetchSnapshot = useServerFn(getDashboardSnapshot);
  const fetchContext = useServerFn(getStudentHubContext);
  const query = useQuery({
    queryKey: ["student-hub-context", viewerId],
    enabled: !!viewerId && !loading,
    queryFn: async ({ signal }) => {
      const context = await fetchContext();
      if (signal.aborted) throw new Error("Workspace selection changed.");
      if (context.viewer_id !== viewerId)
        throw new Error("Your sign-in changed. Please try again.");
      if (!context.student_id) return { context, snapshot: null };
      const snapshot = await fetchSnapshot({ data: { student_id: context.student_id } });
      if (signal.aborted) throw new Error("Workspace selection changed.");
      if (!snapshot.student || snapshot.student.id !== context.student_id)
        throw new Error(
          "Your student profile connection could not be confirmed. Please try again.",
        );
      return { context, snapshot };
    },
    retry: false,
  });
  if (loading || !viewerId || query.isPending)
    return (
      <p role="status" className="rounded-xl border bg-muted/30 p-4 text-sm text-foreground/75">
        Loading your signed-in workspace…
      </p>
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        <p>Your student workspace could not be loaded right now.</p>
        <button type="button" onClick={() => void query.refetch()} className="mt-2 underline">
          Try Again
        </button>
      </div>
    );
  const { context, snapshot } = query.data;
  if (context.management_only)
    return (
      <p className="rounded-xl border p-4 text-sm">
        Manage the website in your{" "}
        <Link to="/owner" className="underline">
          Owner Hub
        </Link>
        .
      </p>
    );
  if (context.connection_status === "ambiguous")
    return (
      <p role="status" className="rounded-xl border p-4 text-sm">
        More than one student profile is connected. Ask your team to confirm the correct connection
        before opening this workspace.
      </p>
    );
  if (!snapshot)
    return (
      <p role="status" className="rounded-xl border bg-muted/30 p-4 text-sm text-foreground/75">
        Your account is signed in, but the student profile connection is not ready yet. Open the
        main dashboard to reconnect it.
      </p>
    );
  return (
    <>
      <LiveStudentWorkspaceOverview key={context.student_id} snapshot={snapshot} />
      <DashboardWidgetBoard role="student" studentId={context.student_id!} />
    </>
  );
}

function SummaryItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-5 first:pl-0 lg:px-6 lg:first:pl-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/75">
        {label}
      </dt>
      <dd className="mt-2 truncate font-display text-xl text-foreground">{value}</dd>
      <dd className="mt-1 truncate text-xs text-foreground/75">{detail}</dd>
    </div>
  );
}
