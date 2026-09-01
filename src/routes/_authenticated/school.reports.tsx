import { createFileRoute, Link } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  TrendingUp,
  FileText,
  ClipboardList,
  Target,
  Download,
  FileDown,
  CalendarIcon,
  Loader2,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns/format";
import { toast } from "sonner";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadJsPdf, loadJsPdfAutoTable } from "@/lib/browser-only-libs";
import { cn } from "@/lib/utils";
import {
  getSchoolReportMetrics,
  listSchoolReports,
  type SchoolOrg,
  type SchoolReportRow,
  type SchoolReportWindow,
} from "@/lib/school-admin.functions";

export const Route = createFileRoute("/_authenticated/school/reports")({
  head: () => ({ meta: [{ title: "School Reports — TransitionForward" }] }),
  component: withRoleGuard(["school_admin", "admin"], SchoolReportsPage),
});

function SchoolReportsPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/reports"
      title="School Reports"
      subtitle="School-wide transition planning activity, readiness, and Pathway Report adoption."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {(org) => <ReportsContent org={org} />}
    </SchoolPageShell>
  );
}

function ReportsContent({ org }: { org: SchoolOrg }) {
  const fetchMetrics = useServerFn(getSchoolReportMetrics);
  const fetchReports = useServerFn(listSchoolReports);
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const [win, setWin] = useState<SchoolReportWindow | null>(null);
  const [reports, setReports] = useState<SchoolReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fromIso = useMemo(() => (from ? startOfDay(from).toISOString() : undefined), [from]);
  const toIso = useMemo(() => (to ? endOfDay(to).toISOString() : undefined), [to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [w, r] = await Promise.all([
          fetchMetrics({ data: { organization_id: org.id, from: fromIso, to: toIso } }),
          fetchReports({ data: { organization_id: org.id } }),
        ]);
        if (!cancelled) {
          setWin(w);
          setReports(r.reports);
        }
      } catch {
        if (!cancelled) toast.error("Could not load school reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [org.id, fromIso, toIso, fetchMetrics, fetchReports]);

  const rangeLabel =
    from && to
      ? `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`
      : from
        ? `From ${format(from, "MMM d, yyyy")}`
        : to
          ? `Through ${format(to, "MMM d, yyyy")}`
          : "All time";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-end gap-3">
          <DateField label="From" value={from} onChange={setFrom} />
          <DateField label="To" value={to} onChange={setTo} />
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom(undefined);
                setTo(undefined);
              }}
            >
              Clear
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Showing metrics for <span className="font-medium">{rangeLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!win}
            onClick={() => win && exportCsv(org, win, rangeLabel)}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!win}
            onClick={() => win && exportPdf(org, win, rangeLabel)}
          >
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {loading || !win ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Students"
              value={win.metrics.students_count}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Pathway Reports"
              value={win.metrics.reports_count}
              icon={<FileText className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Open Action Items"
              value={win.metrics.open_actions}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Active Goals"
              value={win.metrics.active_goals}
              icon={<Target className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <PctCard title="Pathway Report Adoption" pct={win.metrics.pct_with_report}>
              Students with at least one Pathway Report in this window.
            </PctCard>
            <PctCard title="Active Transition Goals" pct={win.metrics.pct_with_goals}>
              Students with at least one active (non-met) goal in this window.
            </PctCard>
            <PctCard title="Action Item Engagement" pct={win.metrics.pct_with_actions}>
              Students with open action items tracked in this window.
            </PctCard>
          </div>

          <div
            id="compliance-milestones"
            className="scroll-mt-24 rounded-2xl border bg-card shadow-soft"
          >
            <div className="flex items-center gap-2 border-b p-5">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <div>
                <h2 className="font-display text-lg">Compliance & Milestones</h2>
                <p className="text-sm text-muted-foreground">
                  Quick view of students who are missing key transition-planning
                  milestones in this window.
                </p>
              </div>
            </div>
            <ComplianceRow
              label="Students without a Pathway Report"
              count={win.metrics.students_count - countWithReport(win)}
              total={win.metrics.students_count}
            />
            <ComplianceRow
              label="Students without any active goals"
              count={win.metrics.students_count - countWithGoals(win)}
              total={win.metrics.students_count}
            />
            <ComplianceRow
              label="Students with no open action items"
              count={win.metrics.students_count - countWithActions(win)}
              total={win.metrics.students_count}
              positive
            />
            <ComplianceRow
              label="Avg. open actions per student"
              count={win.metrics.avg_open_actions_per_student}
              total={null}
              raw
            />
          </div>

          <div id="reports-list" className="scroll-mt-24 rounded-2xl border bg-card shadow-soft">
            <div className="flex items-center gap-2 border-b p-5">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <h2 className="font-display text-lg">Per-Student Progress</h2>
                <p className="text-sm text-muted-foreground">
                  Aggregate counts from records in this window. Individual
                  documents remain protected by each student's access rules.
                </p>
              </div>
            </div>
            {win.students.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No students yet. As staff add students to this school they'll
                show up here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Grade Band</th>
                      <th className="px-4 py-3">Reports</th>
                      <th className="px-4 py-3">Active Goals</th>
                      <th className="px-4 py-3">Open Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {win.students.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-medium">{s.name || "Student"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.grade_band ?? "—"}
                        </td>
                        <td className="px-4 py-3">{s.reports_count}</td>
                        <td className="px-4 py-3">{s.active_goals}</td>
                        <td className="px-4 py-3">{s.open_actions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-display text-lg">Recent Pathway Reports</h2>
                <p className="text-sm text-muted-foreground">
                  Latest Pathway Reports across your students.
                </p>
              </div>
            </div>
            {reports.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                When staff create Pathway Reports for students in this school,
                they'll appear here.
              </div>
            ) : (
              <ul className="divide-y">
                {reports.slice(0, 25).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function countWithReport(w: SchoolReportWindow) {
  return w.students.filter((s) => s.has_report).length;
}
function countWithGoals(w: SchoolReportWindow) {
  return w.students.filter((s) => s.active_goals > 0).length;
}
function countWithActions(w: SchoolReportWindow) {
  return w.students.filter((s) => s.open_actions > 0).length;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-[180px] justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value ? format(value, "MMM d, yyyy") : "Any date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}

function PctCard({
  title,
  pct,
  children,
}: {
  title: string;
  pct: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h3 className="font-display text-base">{title}</h3>
      <div className="mt-3 flex items-end gap-2">
        <div className="font-display text-3xl">{pct}%</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

function ComplianceRow({
  label,
  count,
  total,
  positive,
  raw,
}: {
  label: string;
  count: number;
  total: number | null;
  positive?: boolean;
  raw?: boolean;
}) {
  const pct = total && total > 0 ? Math.round((count / total) * 100) : 0;
  const tone = raw
    ? "text-foreground"
    : positive
      ? count > 0
        ? "text-emerald-600"
        : "text-muted-foreground"
      : count > 0
        ? "text-amber-600"
        : "text-emerald-600";
  return (
    <div className="flex items-center justify-between gap-3 border-t px-5 py-3 first:border-t-0 text-sm">
      <span>{label}</span>
      <span className={cn("font-medium", tone)}>
        {raw ? count : total === null ? count : `${count} of ${total} (${pct}%)`}
      </span>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "school";
}

function buildRows(org: SchoolOrg, w: SchoolReportWindow, rangeLabel: string) {
  const m = w.metrics;
  const summary: Array<[string, string]> = [
    ["School", org.name],
    ["Reporting Window", rangeLabel],
    ["Generated", new Date().toLocaleString()],
    ["Students", String(m.students_count)],
    ["Pathway Reports", String(m.reports_count)],
    ["Open Action Items", String(m.open_actions)],
    ["Active Goals", String(m.active_goals)],
    ["% Students with Report", `${m.pct_with_report}%`],
    ["% Students with Active Goals", `${m.pct_with_goals}%`],
    ["% Students with Open Actions", `${m.pct_with_actions}%`],
    ["Avg Open Actions / Student", String(m.avg_open_actions_per_student)],
  ];
  const studentRows = w.students.map((s) => [
    s.name,
    s.grade_band ?? "",
    s.reports_count,
    s.active_goals,
    s.open_actions,
  ]);
  return { summary, studentRows };
}

function filenameSuffix(w: SchoolReportWindow) {
  const fmt = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  if (w.from && w.to) return `_${fmt(w.from)}_to_${fmt(w.to)}`;
  if (w.from) return `_from_${fmt(w.from)}`;
  if (w.to) return `_through_${fmt(w.to)}`;
  return "_all-time";
}

function exportCsv(org: SchoolOrg, w: SchoolReportWindow, rangeLabel: string) {
  try {
    const { summary, studentRows } = buildRows(org, w, rangeLabel);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push("School Report — Aggregate Metrics");
    summary.forEach((r) => lines.push(r.map(esc).join(",")));
    lines.push("");
    lines.push(["Student", "Grade Band", "Reports", "Active Goals", "Open Actions"].join(","));
    studentRows.forEach((r) => lines.push(r.map(esc).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(org.name)}-school-report${filenameSuffix(w)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  } catch {
    toast.error("Could not export CSV.");
  }
}

async function exportPdf(org: SchoolOrg, w: SchoolReportWindow, rangeLabel: string) {
  try {
    const { jsPDF } = await loadJsPdf();
    const autoTable = (await loadJsPdfAutoTable()).default;
    const { summary, studentRows } = buildRows(org, w, rangeLabel);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("School Report", 14, 18);
    doc.setFontSize(11);
    doc.text(org.name, 14, 26);
    doc.setFontSize(9);
    doc.text(
      `Window: ${rangeLabel} · Generated ${new Date().toLocaleString()}`,
      14,
      32,
    );

    autoTable(doc, {
      startY: 38,
      head: [["Metric", "Value"]],
      body: summary,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    autoTable(doc, {
      head: [["Student", "Grade Band", "Reports", "Active Goals", "Open Actions"]],
      body: studentRows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`${slug(org.name)}-school-report${filenameSuffix(w)}.pdf`);
    toast.success("PDF exported.");
  } catch {
    toast.error("Could not export PDF.");
  }
}
