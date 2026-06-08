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
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
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
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";

export const Route = createFileRoute("/_authenticated/caseload")({
  head: () => ({ meta: [{ title: "Caseload — TransitionForward" }] }),
  component: CaseloadPage,
});

type Filter = "all" | "needs-attention" | "no-report";

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
      setRows(students);
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
    return rows.filter((r) => {
      if (q) {
        const name = `${r.first_name} ${r.last_name ?? ""}`.toLowerCase();
        if (!name.includes(q) && !(r.school ?? "").toLowerCase().includes(q)) return false;
      }
      if (filter === "needs-attention" && r.open_action_items === 0) return false;
      if (filter === "no-report" && r.latest_report_id) return false;
      return true;
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
    <SiteShell>
      <RoleGuard path="/caseload">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Caseload" }]} />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Your Caseload</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Students you own or have been invited to support as an Educator / Case Manager.
            </p>
          </div>
          <Button asChild>
            <Link to="/students"><Plus className="h-4 w-4" /> Add Student</Link>
          </Button>
        </div>

        <div className="mt-6">
          <NextBestAction surface="educator" />
          <OnboardingChecklist surface="educator" className="mt-4" />
        </div>



        {/* Summary cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={<Users className="h-4 w-4" />} label="Students" value={summary.total} />
          <SummaryCard icon={<ClipboardList className="h-4 w-4" />} label="Open Action Items" value={summary.open} />
          <SummaryCard icon={<FileText className="h-4 w-4" />} label="Missing Pathway Report" value={summary.missingReport} />
        </div>

        {/* Team calendar — aggregates events across every student on the caseload */}
        <div className="mt-6">
          <DashboardCalendar
            title="Team calendar"
            subtitle="Meetings, action items, and team-shared events across your caseload."
            studentOptions={rows.map((r) => ({
              id: r.id,
              name: `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`,
            }))}
          />
        </div>



        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students or schools"
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="needs-attention">Open Action Items</SelectItem>
              <SelectItem value="no-report">No Pathway Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="mt-4 rounded-2xl border bg-card shadow-soft">
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
      </section>
      </RoleGuard>
    </SiteShell>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
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
          <Link to="/students"><Plus className="h-4 w-4" /> Add Student</Link>
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
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">
              {row.first_name} {row.last_name ?? ""}
            </p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {row.relationship}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[row.grade_band, row.school].filter(Boolean).join(" · ") || "No school on file"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Stat label="Goals" value={row.goal_count} />
          <Stat label="Open Actions" value={row.open_action_items} tone={row.open_action_items > 0 ? "warn" : undefined} />
          <Stat label="Report" value={row.latest_report_id ? "✓" : "—"} />
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
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
      const { notes } = await fetchNotes({ data: { student_id: row.id } });
      setNotes(notes);
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
    <div className="mt-4 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2">
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
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/students/$studentId" params={{ studentId: row.id }}>Open Profile</Link>
            </Button>
            <Button type="submit" size="sm" disabled={savingAction || !actionTitle.trim()}>
              {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
