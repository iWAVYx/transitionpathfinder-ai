import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  TrendingUp,
  FileText,
  ClipboardList,
  Download,
  FileDown,
  CalendarIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  DistrictPageShell,
  useDistrictDashboard,
} from "@/components/district/DistrictPageShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadJsPdf, loadJsPdfAutoTable } from "@/lib/browser-only-libs";
import { cn } from "@/lib/utils";
import {
  getDistrictReportMetrics,
  type DistrictOrg,
  type DistrictReportWindow,
} from "@/lib/district-admin.functions";

export const Route = createFileRoute("/_authenticated/district/reports")({
  head: () => ({ meta: [{ title: "District Reports — TransitionForward" }] }),
  component: withRoleGuard(["district_admin", "admin"], DistrictReportsPage),
});

function DistrictReportsPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/reports"
      title="District Reports"
      subtitle="District-wide transition planning trends, Pathway Report adoption, and implementation progress."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(district) => <ReportsContent district={district} />}
    </DistrictPageShell>
  );
}

function ReportsContent({ district }: { district: DistrictOrg }) {
  const fetchMetrics = useServerFn(getDistrictReportMetrics);
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const [win, setWin] = useState<DistrictReportWindow | null>(null);
  const [loading, setLoading] = useState(true);

  const fromIso = useMemo(() => (from ? startOfDay(from).toISOString() : undefined), [from]);
  const toIso = useMemo(() => (to ? endOfDay(to).toISOString() : undefined), [to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const w = await fetchMetrics({
          data: { district_id: district.id, from: fromIso, to: toIso },
        });
        if (!cancelled) setWin(w);
      } catch {
        if (!cancelled) toast.error("Could not load reporting metrics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [district.id, fromIso, toIso, fetchMetrics]);

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
            Showing aggregate metrics for <span className="font-medium">{rangeLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!win}
            onClick={() => win && exportCsv(district, win, rangeLabel)}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!win}
            onClick={() => win && exportPdf(district, win, rangeLabel)}
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
              label="Students Across District"
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
              label="Connected Schools"
              value={win.metrics.schools_count}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Pathway Report Adoption" pct={win.metrics.pct_with_report}>
              Percentage of students in the district with at least one Pathway
              Report in this window.
            </Card>
            <Card title="Active Transition Goals" pct={win.metrics.pct_with_goals}>
              Percentage of students with at least one active (non-met) goal
              created in this window.
            </Card>
            <Card title="Action Item Engagement" pct={win.metrics.pct_with_actions}>
              Percentage of students with open action items tracked in this
              window.
            </Card>
          </div>

          <div className="rounded-2xl border bg-card shadow-soft">
            <div className="border-b p-5">
              <h2 className="font-display text-lg">School-by-School Progress</h2>
              <p className="text-sm text-muted-foreground">
                Aggregate counts only. Individual student records remain
                protected — district admins do not have automatic access to
                private documents.
              </p>
            </div>
            {win.schools.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Connect schools from the Schools tab to see progress trends.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">School</th>
                      <th className="px-4 py-3">Students</th>
                      <th className="px-4 py-3">Reports</th>
                      <th className="px-4 py-3">Open Actions</th>
                      <th className="px-4 py-3">% with Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {win.schools.map((s) => {
                      const pct =
                        s.students_count > 0
                          ? Math.round((s.reports_count / s.students_count) * 100)
                          : 0;
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3">{s.students_count}</td>
                          <td className="px-4 py-3">{s.reports_count}</td>
                          <td className="px-4 py-3">{s.open_actions}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
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

function Card({
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

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "district";
}

function buildRows(district: DistrictOrg, w: DistrictReportWindow, rangeLabel: string) {
  const m = w.metrics;
  const summary = [
    ["District", district.name],
    ["Reporting Window", rangeLabel],
    ["Generated", new Date().toLocaleString()],
    ["Connected Schools", String(m.schools_count)],
    ["Students Across District", String(m.students_count)],
    ["Pathway Reports", String(m.reports_count)],
    ["Open Action Items", String(m.open_actions)],
    ["% Students with Report", `${m.pct_with_report}%`],
    ["% Students with Active Goals", `${m.pct_with_goals}%`],
    ["% Students with Open Actions", `${m.pct_with_actions}%`],
  ];
  const schoolRows = w.schools.map((s) => {
    const pct = s.students_count > 0 ? Math.round((s.reports_count / s.students_count) * 100) : 0;
    return [s.name, s.students_count, s.reports_count, s.open_actions, `${pct}%`];
  });
  return { summary, schoolRows };
}

function filenameSuffix(w: DistrictReportWindow) {
  const fmt = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  if (w.from && w.to) return `_${fmt(w.from)}_to_${fmt(w.to)}`;
  if (w.from) return `_from_${fmt(w.from)}`;
  if (w.to) return `_through_${fmt(w.to)}`;
  return "_all-time";
}

function exportCsv(district: DistrictOrg, w: DistrictReportWindow, rangeLabel: string) {
  try {
    const { summary, schoolRows } = buildRows(district, w, rangeLabel);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push("District Report — Aggregate Metrics");
    summary.forEach((r) => lines.push(r.map(esc).join(",")));
    lines.push("");
    lines.push(["School", "Students", "Reports", "Open Actions", "% with Report"].join(","));
    schoolRows.forEach((r) => lines.push(r.map(esc).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(district.name)}-district-report${filenameSuffix(w)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  } catch {
    toast.error("Could not export CSV.");
  }
}

async function exportPdf(district: DistrictOrg, w: DistrictReportWindow, rangeLabel: string) {
  try {
    const { jsPDF } = await loadJsPdf();
    const autoTable = (await loadJsPdfAutoTable()).default;
    const { summary, schoolRows } = buildRows(district, w, rangeLabel);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("District Report", 14, 18);
    doc.setFontSize(11);
    doc.text(district.name, 14, 26);
    doc.setFontSize(9);
    doc.text(
      `Window: ${rangeLabel} · Generated ${new Date().toLocaleString()} · Aggregate metrics only`,
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
      head: [["School", "Students", "Reports", "Open Actions", "% with Report"]],
      body: schoolRows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`${slug(district.name)}-district-report${filenameSuffix(w)}.pdf`);
    toast.success("PDF exported.");
  } catch {
    toast.error("Could not export PDF.");
  }
}
