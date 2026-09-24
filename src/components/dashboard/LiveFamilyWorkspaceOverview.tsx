import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderOpen,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";

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
import type { DashboardSnapshot } from "@/lib/golden-path.functions";
import { toTitleCase } from "@/lib/title-case";

type Props = {
  firstName: string;
  snapshot: DashboardSnapshot;
};

type FamilyWorkspaceCard = ToolPreviewCardProps & {
  dataSource: string;
  privacyNote: string;
};

function formatGradeBand(value: string | null) {
  return value ? toTitleCase(value.replace(/_/g, " ")) : "Grade not set";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date pending"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function reportSectionCount(report: DashboardSnapshot["latestReport"]) {
  if (
    !report ||
    !report.content ||
    typeof report.content !== "object" ||
    Array.isArray(report.content)
  ) {
    return 0;
  }
  return Object.keys(report.content).length;
}

/**
 * Live family workspace styled from the public family demo, but driven only
 * by the signed-in user's authorized dashboard snapshot. Demo fixtures never
 * cross this boundary.
 */
export function LiveFamilyWorkspaceOverview({ firstName, snapshot }: Props) {
  const [activePreview, setActivePreview] = useState<LiveToolPreview | null>(null);
  const student = snapshot.student;
  if (!student) return null;

  const studentName = [student.preferred_name ?? student.first_name, student.last_name]
    .filter(Boolean)
    .join(" ");
  const grade = formatGradeBand(student.grade_band);
  const activeActions = snapshot.actionItems.filter((item) => item.status !== "complete");
  const completedActions = snapshot.actionItems.length - activeActions.length;
  const savedResources = snapshot.recommendedResources.filter((resource) => resource.saved).length;
  const activeConsents = snapshot.consents.filter(
    (consent) => consent.consent_status === "granted" && !consent.revoked_at,
  ).length;
  const reportSections = reportSectionCount(snapshot.latestReport);
  const meetingDate = formatDate(snapshot.upcomingMeeting?.scheduled_at);
  const school = student.school ?? "School not set";
  const familyFocus = student.family_priorities ?? "Add family priorities";

  const liveStudentBoundary =
    "Visible only through your signed-in, role-authorized student workspace.";
  const cards: FamilyWorkspaceCard[] = [
    {
      icon: Users,
      title: "Connected Student",
      status: grade,
      summary: "One shared snapshot — school, team, strengths, interests, and support needs.",
      bullets: [
        { label: "Student", value: studentName },
        { label: "School", value: school },
      ],
      cta: {
        label: "Open Student Hub",
        to: "/students/$studentId",
        params: { studentId: student.id },
      },
      dataSource: "Authorized student profile and team workspace",
      privacyNote: liveStudentBoundary,
    },
    {
      icon: FileText,
      title: "Pathway Report — Family View",
      status: snapshot.latestReport ? "Ready to review" : "Not started",
      tone: snapshot.latestReport ? "success" : "warning",
      summary:
        "Your student's plan in plain language — pathways, priorities, evidence, and next steps.",
      bullets: [
        { label: "Sections", value: reportSections || "—" },
        {
          label: "Last updated",
          value: snapshot.latestReport ? formatDate(snapshot.latestReport.created_at) : "—",
        },
      ],
      cta: snapshot.latestReport
        ? {
            label: "Open Family Report",
            to: "/reports/$reportId",
            params: { reportId: snapshot.latestReport.id },
          }
        : { label: "Create Pathway Report", to: "/pathway" },
      dataSource: "Latest role-authorized Pathway Report",
      privacyNote: "The preview shows report status and counts, not private report text.",
    },
    {
      icon: FolderOpen,
      title: "IEP & Documents",
      status: `${snapshot.documents.length} on file`,
      tone: snapshot.documents.length > 0 ? "success" : "warning",
      summary: "Upload IEPs, evaluations, and family notes with privacy review and clear status.",
      bullets: [
        { label: "On file", value: snapshot.documents.length },
        {
          label: "Needs review",
          value: snapshot.documents.filter((document) => document.status !== "linked").length,
        },
      ],
      cta: { label: "Manage Documents", to: "/documents" },
      dataSource: "Authorized document records",
      privacyNote:
        "Only document counts and workflow status appear here; file contents stay hidden.",
    },
    {
      icon: ClipboardList,
      title: "Meeting Prep",
      status: snapshot.upcomingMeeting ? meetingDate : "Not scheduled",
      tone: snapshot.upcomingMeeting ? "default" : "muted",
      summary:
        "Build family-ready questions, priorities, scripts, and an agenda for the next PPT or IEP.",
      bullets: [
        { label: "Next meeting", value: meetingDate },
        {
          label: "Prep open",
          value: snapshot.meetingPrep.filter((item) => !item.completed).length,
        },
      ],
      cta: { label: "Prep For Meeting", to: "/ppt-prep" },
      dataSource: "Meeting schedule and saved preparation items",
      privacyNote: liveStudentBoundary,
    },
    {
      icon: CalendarDays,
      title: "Calendar",
      status: snapshot.upcomingMeeting ? "1 upcoming" : "Clear",
      tone: "muted",
      summary: "PPTs, IEP reviews, tours, deadlines, and team check-ins in one place.",
      bullets: [
        { label: "Next event", value: meetingDate },
        { label: "Location", value: snapshot.upcomingMeeting?.location ?? "—" },
      ],
      cta: { label: "Open Calendar", to: "/meetings" },
      dataSource: "Authorized meeting calendar",
      privacyNote: liveStudentBoundary,
    },
    {
      icon: CheckSquare,
      title: "Family Action Items",
      status: `${activeActions.length} open`,
      tone: activeActions.length > 0 ? "warning" : "success",
      summary:
        "Small next steps for family, student, educator, or partner — with progress kept together.",
      bullets: [
        { label: "Open", value: activeActions.length },
        { label: "Completed", value: completedActions },
      ],
      cta: { label: "Open Action Items", to: "/family/action-items" },
      dataSource: "Role-authorized action items",
      privacyNote: "The preview uses totals only and does not expose private task notes.",
    },
    {
      icon: BookOpen,
      title: "Recommended Resources",
      status: `${snapshot.recommendedResources.length} matched`,
      tone: "muted",
      summary: "Guides and tools tuned to grade, readiness, goals, and family priorities.",
      bullets: [
        { label: "Suggested", value: snapshot.recommendedResources.length },
        { label: "Saved", value: savedResources },
      ],
      cta: { label: "Open Resources", to: "/family/resources/recommended" },
      dataSource: "Student-matched and saved resources",
      privacyNote: liveStudentBoundary,
    },
    {
      icon: ShieldCheck,
      title: "Sharing & Consent",
      status: `${activeConsents} active`,
      tone: activeConsents > 0 ? "success" : "muted",
      summary: "Control AI processing, document storage, team sharing, and report links.",
      bullets: [
        { label: "Active consents", value: activeConsents },
        { label: "Privacy", value: "Invite-only" },
      ],
      cta: { label: "Manage Sharing", to: "/family/consent" },
      dataSource: "Active consent records",
      privacyNote: "Consent details remain in the full authorized student workspace.",
    },
    {
      icon: UserPlus,
      title: "Invite Team Members",
      status: "You control access",
      tone: "muted",
      summary:
        "Bring in a co-parent, educator, case manager, coach, or advocate with the right access.",
      bullets: [
        { label: "Default", value: "Private" },
        { label: "Access", value: "Revocable" },
      ],
      cta: { label: "Manage Student Team", to: "/family/invites" },
      dataSource: "Student-team access controls",
      privacyNote: "No invite addresses or private team details appear in this preview.",
    },
    {
      icon: HeartHandshake,
      title: "Partner Network",
      status: "Explore matches",
      tone: "default",
      summary:
        "Search verified services, programs, training, enrichment, and real-world opportunities.",
      bullets: [
        { label: "Matched by", value: "Goals + interests" },
        { label: "Documents shared", value: "Never" },
      ],
      cta: { label: "See Partner Matches", to: "/partner-network" },
      dataSource: "Student goals and interests matched to public partner listings",
      privacyNote: "Private documents are never shared with partner listings.",
    },
    {
      icon: MessageSquare,
      title: "Transition Channel",
      status: "Team communication",
      tone: "default",
      summary: "Keep role-aware conversations, questions, and follow-ups connected to the student.",
      bullets: [
        { label: "Context", value: student.first_name },
        { label: "Visibility", value: "Team-scoped" },
      ],
      cta: { label: "Open Channel", to: "/transition-channel" },
      dataSource: "Role-scoped Transition Channel context",
      privacyNote: "Message contents remain inside the full team-scoped channel.",
    },
  ];

  return (
    <section data-testid="live-family-dashboard-overview">
      <div className="grid gap-8 border-b border-border/70 pb-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Parent / Guardian
            </span>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold text-foreground/75">
              Signed-in workspace
            </span>
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Family Planning Overview
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            Your Family Workspace — {studentName}.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            Welcome back, {toTitleCase(firstName)}. This is the same clear structure as the demo,
            now powered by your authorized student data, real tools, and saved progress.
          </p>
        </div>

        <aside className="border-l-2 border-primary/35 pl-5" aria-label="Selected student">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Selected Student
          </p>
          <p className="mt-3 font-display text-2xl">{studentName}</p>
          <p className="mt-1 text-sm text-foreground/75">
            {grade} · {school}
          </p>
          {student.student_voice_statement ? (
            <blockquote className="mt-4 border-l-2 border-primary/60 pl-3 text-sm italic text-foreground/75">
              “{student.student_voice_statement}”
            </blockquote>
          ) : (
            <p className="mt-4 text-sm text-foreground/75">
              Add Student Voice so the plan reflects what {student.first_name} wants the team to
              know.
            </p>
          )}
        </aside>
      </div>

      <dl className="grid border-b border-border/70 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border/70">
        <SummaryItem
          label="Connected Student"
          value={studentName}
          detail={`${grade} · ${school}`}
        />
        <SummaryItem
          label="Pathway Report"
          value={snapshot.latestReport ? "Ready to review" : "Not started"}
          detail={
            snapshot.latestReport
              ? `${reportSections || "Several"} sections available`
              : "Build the first report"
          }
        />
        <SummaryItem
          label="Documents"
          value={`${snapshot.documents.length} on file`}
          detail={snapshot.documents[0]?.title ?? "Upload the current IEP"}
        />
        <SummaryItem label="Family Focus" value={familyFocus} detail="Guides the next best step" />
      </dl>

      <div data-testid="live-family-workspace-grid">
        <ToolPreviewSection
          eyebrow="Your Family Workspace"
          title="Everything You Need Before The Next Meeting"
          description="Every card is connected to a real signed-in tool and reflects live student data or a truthful empty state."
        >
          <ToolPreviewGrid>
            {cards.map(({ dataSource, privacyNote, ...card }) => (
              <ToolPreviewCard
                key={card.title}
                {...card}
                onPreview={() =>
                  setActivePreview({
                    icon: card.icon,
                    title: card.title,
                    summary: card.summary ?? "Open this tool to see the full signed-in experience.",
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

function SummaryItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-5 first:pl-0 lg:px-6 lg:first:pl-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/75">
        {label}
      </dt>
      <dd className="mt-2 truncate font-display text-xl text-foreground">{value}</dd>
      <p className="mt-1 truncate text-xs text-foreground/75">{detail}</p>
    </div>
  );
}
