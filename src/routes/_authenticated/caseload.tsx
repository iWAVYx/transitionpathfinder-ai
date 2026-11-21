import { CaseloadQuickTools as Expanded } from "@/components/students/CaseloadQuickTools";
import { useAuth } from "@/hooks/use-auth";
import { useCaseloadRead } from "@/hooks/use-caseload-read";
import { formatGradeBand } from "@/lib/grade-band-label";
import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Search,
  Plus,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  CalendarClock,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCaseload, type CaseloadStudent } from "@/lib/caseload.functions";

import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { PageContainer } from "@/components/layout/PageContainer";

import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";
import { LiveEducatorWorkspaceOverview } from "@/components/dashboard/LiveEducatorWorkspaceOverview";

export const Route = createFileRoute("/_authenticated/caseload")({
  head: () => ({ meta: [{ title: "Caseload — TransitionForward" }] }),
  errorComponent: dashboardErrorComponent("educator"),
  validateSearch: z.object({ view: z.enum(["students"]).optional().catch(undefined) }),
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
  const { user, loading } = useAuth();
  if (loading) return <p>Loading caseload…</p>;
  if (!user) return <p>Sign in to view your caseload.</p>;
  return <CaseloadPageSession key={user.id} />;
}
function CaseloadPageSession() {
  const { view } = Route.useSearch();
  const fetchCaseload = useServerFn(getCaseload);
  const {
    data: { students: rows },
    loading,
    error: loadError,
    reload,
  } = useCaseloadRead(fetchCaseload, { students: [] as CaseloadStudent[] });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                {loadError ? (
                  <div role="alert" className="rounded-xl border p-4 text-sm">
                    Your caseload could not be fully loaded.{" "}
                    <Button variant="outline" onClick={() => void reload()}>
                      Refresh Caseload
                    </Button>
                  </div>
                ) : view !== "students" ? (
                  <>
                    <LiveEducatorWorkspaceOverview students={rows} loading={loading} />
                    <DashboardWidgetBoard role="educator" />
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button asChild>
                        <Link to="/students">
                          <Plus className="h-4 w-4" /> Invite Student
                        </Link>
                      </Button>
                    </div>
                    {/* Filters */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-foreground/75" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search students or schools"
                          className="pl-8"
                        />
                      </div>
                      <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                        <SelectTrigger
                          className="w-full sm:w-[220px]"
                          aria-label="Filter caseload students"
                        >
                          <SelectValue />
                        </SelectTrigger>
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
                        <div className="flex items-center justify-center p-10 text-sm text-foreground/75">
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
                  </>
                )}
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
    <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-foreground/75 sm:px-6 lg:px-8">
      Checking access…
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="px-6 py-12 text-center">
      <Users className="mx-auto h-8 w-8 text-foreground/75" />
      <h3 className="mt-3 font-display text-lg">
        {hasAny ? "No matches" : "Your caseload is empty"}
      </h3>
      <p className="mt-1 text-sm text-foreground/75">
        {hasAny
          ? "Try clearing your filters or search."
          : "Ask a family to invite you as a collaborator, or add a student you own to start tracking."}
      </p>
      {!hasAny && (
        <Button asChild className="mt-4">
          <Link to="/students" hash="caseload-empty" aria-label="Add your first student">
            <Plus className="h-4 w-4" /> Add your first student
          </Link>
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
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-foreground/75">
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
          <p className="mt-0.5 text-xs text-foreground/75">
            {[row.grade_band ? formatGradeBand(row.grade_band) : null, row.school]
              .filter(Boolean)
              .join(" · ") || "No school on file"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Stat label="Goals" value={row.goal_count} />
          <Stat
            label="Open Actions"
            value={row.open_action_items}
            tone={row.open_action_items > 0 ? "warn" : undefined}
          />
          <Stat label="Report" value={row.latest_report_id ? "✓" : "—"} />
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            aria-label={expanded ? "Collapse row" : "Expand row"}
          >
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

      {expanded && (
        <Expanded key={row.id + ":" + row.relationship} row={row} onChanged={onChanged} />
      )}
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="text-center">
      <p
        className={`text-sm font-semibold ${tone === "warn" ? "text-amber-600 dark:text-amber-400" : ""}`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-foreground/75">{label}</p>
    </div>
  );
}
