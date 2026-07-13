import { CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Deadline = {
  label: string;
  cadence: string;
  when: string; // human date
  iso: string; // yyyy-mm-dd
  detail: string;
};

function nextOccurrence(month: number, day: number): { iso: string; when: string } {
  const now = new Date();
  const year =
    now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() > day)
      ? now.getFullYear() + 1
      : now.getFullYear();
  const d = new Date(Date.UTC(year, month - 1, day));
  return {
    iso: d.toISOString().slice(0, 10),
    when: d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
  };
}

function deadlines(scope: "district" | "school"): Deadline[] {
  const feb1 = nextOccurrence(2, 1);
  const jun30 = nextOccurrence(6, 30);
  const nov1 = nextOccurrence(11, 1);
  const list: Deadline[] = [
    {
      label: "Indicator 13 — Secondary Transition (IDEA)",
      cadence: "Annual",
      when: nov1.when,
      iso: nov1.iso,
      detail: "Percent of IEPs age 16+ with measurable postsecondary goals and coordinated transition services.",
    },
    {
      label: "Indicator 14 — Post-School Outcomes",
      cadence: "Annual (exit survey 1 year post-exit)",
      when: feb1.when,
      iso: feb1.iso,
      detail: "Percent of youth with IEPs enrolled in higher ed, employed, or both within one year of leaving school.",
    },
    {
      label: "State Performance Plan / APR",
      cadence: "Annual",
      when: jun30.when,
      iso: jun30.iso,
      detail: "State-level SPP/APR submission window closes. Local data must be finalized ahead of this date.",
    },
  ];
  if (scope === "district") {
    list.unshift({
      label: "District Data Certification",
      cadence: "Quarterly",
      when: "End of each quarter",
      iso: "",
      detail: "Certify aggregated school-level counts (students served, active IEPs, transition planning coverage).",
    });
  }
  return list;
}

export function ReportingDeadlinesCard({ scope }: { scope: "district" | "school" }) {
  const today = new Date();
  const items = deadlines(scope).map((d) => {
    if (!d.iso) return { ...d, daysAway: null as number | null };
    const diff = Math.round((new Date(d.iso).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...d, daysAway: diff };
  });

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="font-medium">Reporting Deadlines</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Federal and state transition reporting checkpoints so nothing slips through the cracks.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((d) => {
          const soon = d.daysAway !== null && d.daysAway <= 30 && d.daysAway >= 0;
          const overdue = d.daysAway !== null && d.daysAway < 0;
          return (
            <li key={d.label} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{d.cadence} · Due {d.when}</div>
                </div>
                {overdue ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Past due
                  </Badge>
                ) : soon ? (
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 gap-1">
                    <AlertTriangle className="h-3 w-3" /> In {d.daysAway}d
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {d.daysAway !== null ? `${d.daysAway}d away` : "Recurring"}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{d.detail}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
