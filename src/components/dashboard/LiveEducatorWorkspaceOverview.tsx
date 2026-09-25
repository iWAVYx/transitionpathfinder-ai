import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  CheckSquare,
  ClipboardEdit,
  FileSearch,
  FileText,
  Gauge,
  HeartHandshake,
  MessageSquare,
  NotebookPen,
  Users,
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
import { getCaseload, type CaseloadStudent } from "@/lib/caseload.functions";

type EducatorWorkspaceCard = ToolPreviewCardProps & {
  dataSource: string;
  privacyNote: string;
};

type Props = {
  students?: CaseloadStudent[];
  loading?: boolean;
};

function isWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  const now = Date.now();
  return timestamp >= now && timestamp <= now + days * 24 * 60 * 60 * 1000;
}

function isWithinPastDays(value: string | null, days: number) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  const now = Date.now();
  return timestamp <= now && timestamp >= now - days * 24 * 60 * 60 * 1000;
}

/**
 * Demo-shaped Educator workspace driven by the role-authorized caseload.
 * Previews stay aggregate-first so student PII is not exposed at a glance.
 */
export function LiveEducatorWorkspaceOverview({
  students: provided,
  loading: providedLoading,
}: Props) {
  const fetchCaseload = useServerFn(getCaseload);
  const [loaded, setLoaded] = useState<CaseloadStudent[]>([]);
  const [internalLoading, setInternalLoading] = useState(provided === undefined);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<LiveToolPreview | null>(null);

  useEffect(() => {
    if (provided !== undefined) return;
    let active = true;
    setInternalLoading(true);
    fetchCaseload()
      .then(({ students }) => {
        if (active) setLoaded(Array.from(new Map(students.map((row) => [row.id, row])).values()));
      })
      .catch(() => {
        if (active) setError("Your authorized caseload could not be loaded right now.");
      })
      .finally(() => {
        if (active) setInternalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCaseload, provided]);

  const students = provided ?? loaded;
  const loading = providedLoading ?? internalLoading;
  const summary = useMemo(() => {
    const openActions = students.reduce((total, row) => total + row.open_action_items, 0);
    const missingReports = students.filter((row) => !row.latest_report_id).length;
    const noGoals = students.filter((row) => row.goal_count === 0).length;
    const upcomingMeetings = students.filter((row) => isWithinDays(row.next_meeting_at, 30)).length;
    const meetingsSoon = students.filter((row) => isWithinDays(row.next_meeting_at, 14)).length;
    const withRecentNotes = students.filter((row) => isWithinPastDays(row.last_note_at, 7)).length;
    const withReports = students.length - missingReports;
    return {
      openActions,
      missingReports,
      noGoals,
      upcomingMeetings,
      meetingsSoon,
      withRecentNotes,
      withReports,
      needsAttention: students.filter(
        (row) => row.open_action_items > 0 || !row.latest_report_id || row.goal_count === 0,
      ).length,
    };
  }, [students]);

  if (error && provided === undefined) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        {error}
      </p>
    );
  }

  const aggregateBoundary =
    "At-a-glance previews use authorized caseload totals only. Open the full tool to view permitted student records.";
  const cards: EducatorWorkspaceCard[] = [
    {
      icon: Users,
      title: "Caseload Snapshot",
      status: loading ? "Loading" : `${students.length} students`,
      summary: "Every student you are authorized to support, with the next work surfaced clearly.",
      bullets: [
        { label: "Needs attention", value: loading ? "—" : summary.needsAttention },
        { label: "Meeting ≤14d", value: loading ? "—" : summary.meetingsSoon },
      ],
      cta: { label: "Open Caseload", to: "/caseload" },
      dataSource: "Your role-authorized caseload",
      privacyNote: aggregateBoundary,
    },
    {
      icon: Gauge,
      title: "Readiness & Evidence Gaps",
      status: loading ? "Loading" : `${summary.missingReports + summary.noGoals} signals`,
      tone: summary.missingReports + summary.noGoals > 0 ? "warning" : "success",
      summary: "Find missing report or goal evidence that may block a defensible transition plan.",
      bullets: [
        { label: "No report", value: loading ? "—" : summary.missingReports },
        { label: "No goals", value: loading ? "—" : summary.noGoals },
      ],
      cta: { label: "See Readiness Gaps", to: "/educator/readiness-gaps" },
      dataSource: "Authorized report and goal presence across your caseload",
      privacyNote: aggregateBoundary,
    },
    {
      icon: ClipboardEdit,
      title: "Pending Educator Input",
      status: "Open queue",
      tone: "muted",
      summary:
        "Review student sections that need educator evidence or confirmation before drafting.",
      bullets: [
        { label: "Open actions", value: loading ? "—" : summary.openActions },
        { label: "Reports missing", value: loading ? "—" : summary.missingReports },
      ],
      cta: { label: "Review Pending Input", to: "/educator/pending-input" },
      dataSource:
        "Live totals available from the authorized caseload; item details load in the queue",
      privacyNote: aggregateBoundary,
    },
    {
      icon: FileText,
      title: "Pathway Reports",
      status: loading ? "Loading" : `${summary.withReports} available`,
      tone: summary.missingReports === 0 && students.length > 0 ? "success" : "warning",
      summary: "Open the latest reports and see which student plans still need a first report.",
      bullets: [
        { label: "Available", value: loading ? "—" : summary.withReports },
        { label: "Missing", value: loading ? "—" : summary.missingReports },
      ],
      cta: { label: "Open Reports", to: "/reports" },
      dataSource: "Report availability in your authorized caseload",
      privacyNote: "Report text is never exposed in the dashboard preview.",
    },
    {
      icon: CalendarDays,
      title: "Meetings & Calendar",
      status: loading ? "Loading" : `${summary.upcomingMeetings} next 30 days`,
      tone: "muted",
      summary: "Coordinate PPTs, IEP meetings, prep windows, and team follow-ups.",
      bullets: [
        { label: "Next 14 days", value: loading ? "—" : summary.meetingsSoon },
        { label: "Next 30 days", value: loading ? "—" : summary.upcomingMeetings },
      ],
      cta: { label: "Open Calendar", to: "/meetings" },
      dataSource: "Upcoming meetings in your authorized caseload",
      privacyNote: aggregateBoundary,
    },
    {
      icon: NotebookPen,
      title: "Case Notes",
      status: loading ? "Loading" : `${summary.withRecentNotes} updated`,
      tone: "muted",
      summary: "Capture timestamped student notes and keep team context connected to the plan.",
      bullets: [
        { label: "Updated ≤7d", value: loading ? "—" : summary.withRecentNotes },
        { label: "Caseload", value: loading ? "—" : students.length },
      ],
      cta: { label: "Open Case Notes", to: "/educator/notes" },
      dataSource: "Latest-note timestamps for your authorized caseload",
      privacyNote: "Private note text is hidden from this aggregate preview.",
    },
    {
      icon: CheckSquare,
      title: "Action Items",
      status: loading ? "Loading" : `${summary.openActions} open`,
      tone: summary.openActions > 0 ? "warning" : "success",
      summary: "Assign and track next steps for educators, students, families, and partners.",
      bullets: [
        { label: "Open", value: loading ? "—" : summary.openActions },
        { label: "Students", value: loading ? "—" : students.length },
      ],
      cta: { label: "Open Action Items", to: "/educator/action-items" },
      dataSource: "Open action-item totals in your authorized caseload",
      privacyNote: "Task text is shown only inside the full role-authorized tool.",
    },
    {
      icon: FileSearch,
      title: "Document Review",
      status: "Open review queue",
      tone: "muted",
      summary:
        "Review IEPs, evaluations, and family uploads through the protected document workflow.",
      bullets: [
        { label: "Privacy review", value: "Required" },
        { label: "Malware status", value: "Enforced" },
      ],
      cta: { label: "Open Review Queue", to: "/educator/document-review" },
      dataSource: "Document counts and records load inside the protected review tool",
      privacyNote: "No document names, text, or personal information appear in this preview.",
    },
    {
      icon: HeartHandshake,
      title: "Partner Network",
      status: "Explore options",
      summary:
        "Find services, after-school programs, enrichment, training, and work-based opportunities.",
      bullets: [
        { label: "Directory", value: "Verified listings" },
        { label: "Private files", value: "Never shared" },
      ],
      cta: { label: "Open Partner Network", to: "/partner-network" },
      dataSource: "Public partner and opportunity listings",
      privacyNote: "Student PII and documents are not shared through directory browsing.",
    },
    {
      icon: MessageSquare,
      title: "Transition Channel",
      status: "Team communication",
      summary: "Keep role-aware questions, updates, and follow-ups connected to each team.",
      bullets: [
        { label: "Scope", value: "Authorized teams" },
        { label: "Preview", value: "No message text" },
      ],
      cta: { label: "Open Channel", to: "/transition-channel" },
      dataSource: "Role-scoped Transition Channel access",
      privacyNote: "Message contents remain inside the full authorized channel.",
    },
  ];

  return (
    <section data-testid="live-educator-dashboard-overview">
      <div className="grid gap-8 border-b border-border/70 pb-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Educator / Case Manager
            </span>
            <span className="rounded-full border px-3 py-1 text-xs font-semibold text-foreground/75">
              Signed-in workspace
            </span>
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Caseload Planning Overview
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            Your Caseload, In One Clear View.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            The demo’s preview-first structure now uses your permitted caseload totals, with the
            complete working tools available one level deeper.
          </p>
        </div>
        <aside className="border-l-2 border-primary/35 pl-5" aria-label="Caseload summary">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Today’s Focus
          </p>
          <p className="mt-3 font-display text-2xl">
            {loading ? "Loading caseload" : `${summary.needsAttention} need attention`}
          </p>
          <p className="mt-1 text-sm text-foreground/75">
            {loading
              ? "Gathering authorized totals"
              : `${students.length} students · ${summary.openActions} open actions`}
          </p>
          <p className="mt-4 text-sm text-foreground/75">
            Preview stays aggregate-first. Student details appear only after you open an authorized
            tool.
          </p>
        </aside>
      </div>

      <dl className="grid border-b border-border/70 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border/70">
        <SummaryItem
          label="Students"
          value={loading ? "—" : `${students.length}`}
          detail="Authorized caseload"
        />
        <SummaryItem
          label="Open Actions"
          value={loading ? "—" : `${summary.openActions}`}
          detail="Across permitted students"
        />
        <SummaryItem
          label="Reports Missing"
          value={loading ? "—" : `${summary.missingReports}`}
          detail={`${summary.withReports} available`}
        />
        <SummaryItem
          label="Meetings ≤30d"
          value={loading ? "—" : `${summary.upcomingMeetings}`}
          detail={`${summary.meetingsSoon} within 14 days`}
        />
      </dl>

      <div data-testid="live-educator-workspace-grid">
        <ToolPreviewSection
          eyebrow="Your Caseload Workspace"
          title="Preview The Work, Then Open The Full Tool"
          description="Every preview uses permitted aggregate data or clearly says when details load only inside the protected tool."
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
