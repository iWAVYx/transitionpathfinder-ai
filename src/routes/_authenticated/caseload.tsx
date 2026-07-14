import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users,
  Search,
  ClipboardList,
  Target,
  StickyNote,
  Plus,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCaseload,
  addCaseManagerNote,
  quickAssignActionItem,
  listStudentNotes,
  type CaseloadStudent,
} from "@/lib/caseload.functions";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { JourneyStrip } from "@/components/dashboard/JourneyStrip";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatGrid, StatCard } from "@/components/layout/StatGrid";
import { CollapsibleSection } from "@/components/layout/CollapsibleSection";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";


export const Route = createFileRoute("/_authenticated/caseload")({
  head: () => ({ meta: [{ title: "Caseload — TransitionForward" }] }),
  errorComponent: dashboardErrorComponent("educator"),
  component: CaseloadPage,
});

type Filter = "all" | "needs-attention" | "no-report" | "today" | "this-week";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function endOfThisWeek(): Date {
  // Treat week as next 7 days inclusive
  const d = endOfToday();
  d.setDate(d.getDate() + 6);
  return d;
}
function uniqueStudents(students: CaseloadStudent[]): CaseloadStudent[] {
  return Array.from(new Map(students.map((student) => [student.id, student])).values());
}
function formatMeetingChip(iso: string): string {
  const d = new Date(iso);
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  if (d >= today && d < tomorrow) {
    return `Today · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  if (d >= tomorrow && d < dayAfter) {
    return `Tomorrow · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CaseloadPage() {
  const fetchCaseload = useServerFn(getCaseload);
  const [rows, setRows] = useState<CaseloadStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const { students } = await fetchCaseload();
      setRows(uniqueStudents(students));
    } catch {
      toast.error("Could not load caseload.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const todayEnd = endOfToday().getTime();
    const weekEnd = endOfThisWeek().getTime();
    const now = Date.now();
    const result = rows.filter((r) => {
      if (q) {
        const name = `${r.first_name} ${r.last_name ?? ""}`.toLowerCase();
        if (!name.includes(q) && !(r.school ?? "").toLowerCase().includes(q)) return false;
      }
      if (filter === "needs-attention" && r.open_action_items === 0) return false;
      if (filter === "no-report" && r.latest_report_id) return false;
      if (filter === "today") {
        if (!r.next_meeting_at) return false;
        const t = new Date(r.next_meeting_at).getTime();
        if (t < now || t > todayEnd) return false;
      }
      if (filter === "this-week") {
        if (!r.next_meeting_at) return false;
        const t = new Date(r.next_meeting_at).getTime();
        if (t < now || t > weekEnd) return false;
      }
      return true;
    });
    // Sort: students with an upcoming meeting first (soonest), then by name.
    return result.slice().sort((a, b) => {
      const at = a.next_meeting_at ? new Date(a.next_meeting_at).getTime() : Infinity;
      const bt = b.next_meeting_at ? new Date(b.next_meeting_at).getTime() : Infinity;
      if (at !== bt) return at - bt;
      return `${a.first_name} ${a.last_name ?? ""}`.localeCompare(
        `${b.first_name} ${b.last_name ?? ""}`,
      );
    });
  }, [rows, query, filter]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      open: rows.reduce((n, r) => n + r.open_action_items, 0),
      missingReport: rows.filter((r) => !r.latest_report_id).length,
    };
  }, [rows]);

  return (
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.educator}>
      <div className="demo-shell">
      <CaseloadRoleLandmark />
      <div>

      <RoleGuard path="/caseload" fallback={<CaseloadAccessFallback />}>
      <PageContainer>

        <Breadcrumbs trail={[{ label: "Caseload" }]} />
        <RoleValueStrip role="educator" className="mt-4" />




        <div className="mt-4 space-y-6 sm:space-y-8">
          <PageHeader
            eyebrow="Educator / Case Manager"
            title="Caseload Overview"
            description="Every student assigned to you — upcoming meetings, pending transition tasks, and Pathway Reports needing review."
            action={
              <Button asChild className="w-full sm:w-auto">
                <Link to="/students"><Plus className="h-4 w-4" /> Invite Student</Link>
              </Button>
            }
          />

          {/* Primary: Next best action + onboarding */}
          <div className="space-y-4">
            <NextBestAction surface="educator" /><div className="mt-4"><JourneyStrip surface="educator" /></div>
            <OnboardingChecklist surface="educator" />
          </div>

          {/* Summary KPIs */}
          <StatGrid cols={3}>
            <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Students" value={summary.total} />
            <StatCard
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label="Open Action Items"
              value={summary.open}
              tone={summary.open > 0 ? "warn" : "default"}
            />
            <button
              type="button"
              onClick={() => {
                setFilter("no-report");
                setQuery("");
                if (typeof window !== "undefined") {
                  document.getElementById("caseload-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="text-left rounded-2xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Filter to students missing a Pathway Report"
            >
              <StatCard
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Missing Pathway Report"
                value={summary.missingReport}
                tone={summary.missingReport > 0 ? "warn" : "default"}
                hint={summary.missingReport > 0 ? "Tap to filter" : undefined}
              />
            </button>
          </StatGrid>

          {/* Educator quick links — surfaces tied to caseload work */}
          <div className="grid grid-cols-2 divide-y divide-border/60 border-y border-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <EducatorQuickLink to="/teacher-portal" icon={<ShieldAlert className="h-4 w-4" />} label="Teacher Portal" desc="Milestones & compliance" />
            <EducatorQuickLink to="/meeting-templates" icon={<ClipboardCheck className="h-4 w-4" />} label="Templates" desc="Agendas & checklists" />
            <EducatorQuickLink to="/goals" icon={<Target className="h-4 w-4" />} label="Goal Tracker" desc="Transition goals" />
          </div>


          {/* Secondary: team calendar — collapsed on mobile to reduce density */}
          <CollapsibleSection
            title="Team Calendar"
            description="Meetings, action items, and team-shared events across your caseload."
            icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          >
            <DashboardCalendar
              title="Team Calendar"
              subtitle="Meetings, action items, and team-shared events across your caseload."
              studentOptions={rows.map((r) => ({
                id: r.id,
                name: `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`,
              }))}
            />
          </CollapsibleSection>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students or schools"
                className="pl-8"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="today">Meeting Today</SelectItem>
                <SelectItem value="this-week">Meeting This Week</SelectItem>
                <SelectItem value="needs-attention">Open Action Items</SelectItem>
                <SelectItem value="no-report">No Pathway Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caseload list */}
          <div id="caseload-list" className="scroll-mt-24 border-y border-border/70">
            {loading ? (
              <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading caseload…
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState hasAny={rows.length > 0} />
            ) : (
              <ul className="divide-y">
                {filtered.map((r) => (
                  <CaseloadRow
                    key={r.id}
                    row={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    onChanged={reload}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </PageContainer>
      </RoleGuard>
      </div>
      </div>

    </SiteShell>
  );

}

function CaseloadRoleLandmark() {
  return (
    <p
      className="mx-auto max-w-7xl px-4 pt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:px-6 lg:px-8"
      data-dashboard-landmark="caseload"
    >
      Caseload Overview
    </p>
  );
}

function CaseloadAccessFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
      Checking access…
    </div>
  );
}


function EducatorQuickLink({ to, icon, label, desc }: { to: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-1 px-2 py-3 transition hover:bg-muted/35"
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-[11px] text-muted-foreground/80 group-hover:text-foreground">{desc}</span>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="px-6 py-12 text-center">
      <Users className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg">
        {hasAny ? "No matches" : "Your caseload is empty"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAny
          ? "Try clearing your filters or search."
          : "Ask a family to invite you as a collaborator, or add a student you own to start tracking."}
      </p>
      {!hasAny && (
        <Button asChild className="mt-4">
          <Link to="/students" hash="caseload-empty" aria-label="Add your first student"><Plus className="h-4 w-4" /> Add your first student</Link>
        </Button>
      )}
    </div>
  );
}

function CaseloadRow({
  row,
  expanded,
  onToggle,
  onChanged,
}: {
  row: CaseloadStudent;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void | Promise<void>;
}) {
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">
              {row.first_name} {row.last_name ?? ""}
            </p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {row.relationship}
            </span>
            {row.next_meeting_at && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                title={row.next_meeting_title ?? "Upcoming meeting"}
              >
                <CalendarClock className="h-3 w-3" />
                {formatMeetingChip(row.next_meeting_at)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[row.grade_band, row.school].filter(Boolean).join(" · ") || "No school on file"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Stat label="Goals" value={row.goal_count} />
          <Stat label="Open Actions" value={row.open_action_items} tone={row.open_action_items > 0 ? "warn" : undefined} />
          <Stat label="Report" value={row.latest_report_id ? "✓" : "—"} />
          <Button size="sm" variant="ghost" onClick={onToggle} aria-label={expanded ? "Collapse row" : "Expand row"}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Per-student action ribbon — one-click jumps into the daily loop. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/students/$studentId" params={{ studentId: row.id }}>
            Open Student Profile
          </Link>
        </Button>
        {row.next_meeting_id ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/meetings/$meetingId" params={{ meetingId: row.next_meeting_id }}>
              <CalendarClock className="h-3.5 w-3.5" />
              Prep Meeting
            </Link>
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={onToggle}>
            <CalendarClock className="h-3.5 w-3.5" />
            Plan Meeting
          </Button>
        )}
        {row.latest_report_id && (
          <Button asChild size="sm" variant="outline">
            <Link to="/reports/$reportId" params={{ reportId: row.latest_report_id }}>
              <FileText className="h-3.5 w-3.5" /> Open Report
            </Link>
          </Button>
        )}
      </div>

      {expanded && <Expanded row={row} onChanged={onChanged} />}
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-semibold ${tone === "warn" ? "text-amber-600 dark:text-amber-400" : ""}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Expanded({ row, onChanged }: { row: CaseloadStudent; onChanged: () => void | Promise<void> }) {
  const addNote = useServerFn(addCaseManagerNote);
  const addAction = useServerFn(quickAssignActionItem);
  const fetchNotes = useServerFn(listStudentNotes);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionPriority, setActionPriority] = useState<"low" | "medium" | "high">("medium");
  const [savingAction, setSavingAction] = useState(false);
  const [notes, setNotes] = useState<Array<{ id: string; content: string; created_at: string; note_type: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const { notes } = await fetchNotes({ data: { student_id: row.id } });
        setNotes(notes);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load notes.");
        setNotes([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await addNote({ data: { student_id: row.id, content: note.trim(), visibility: "team" } });
      setNote("");
      toast.success("Note saved.");
      const { notes } = await fetchNotes({ data: { student_id: row.id } });
      setNotes(notes);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleAssignAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionTitle.trim()) return;
    setSavingAction(true);
    try {
      await addAction({
        data: {
          student_id: row.id,
          title: actionTitle.trim(),
          category: "teacher",
          priority: actionPriority,
        },
      });
      setActionTitle("");
      toast.success("Action item created.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create action.");
    } finally {
      setSavingAction(false);
    }
  }

  return (
    <div className="mt-4 grid gap-4 border-t border-border/60 pt-4 md:grid-cols-2">
      {/* Quick note */}
      <form onSubmit={handleSaveNote} className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <StickyNote className="h-3.5 w-3.5" /> Add Case Manager Note
        </Label>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What changed this week? Observations, follow-ups, family updates…"
          maxLength={4000}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={savingNote || !note.trim()}>
            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Note
          </Button>
        </div>
        {notes.length > 0 && (
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto border-t pt-2 text-xs">
            {notes.slice(0, 5).map((n) => (
              <li key={n.id}>
                <p className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                <p className="text-foreground">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* Quick assign action */}
      <form onSubmit={handleAssignAction} className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <Target className="h-3.5 w-3.5" /> Assign Action Item
        </Label>
        <Input
          value={actionTitle}
          onChange={(e) => setActionTitle(e.target.value)}
          placeholder="e.g. Schedule transition planning meeting"
          maxLength={200}
        />
        <div className="flex items-center gap-2">
          <Select value={actionPriority} onValueChange={(v) => setActionPriority(v as any)}>
            <SelectTrigger className="w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button type="submit" size="sm" disabled={savingAction || !actionTitle.trim()}>
              {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
