import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SchoolMetric {
  schoolId: string;
  name: string;
  readinessPct: number;
  students: number;
  topGap?: string;
  trend?: "up" | "down" | "flat";
}

const SAMPLE: SchoolMetric[] = [
  { schoolId: "hrhs", name: "Hartford Regional HS", readinessPct: 82, students: 214, topGap: "Employment", trend: "up" },
  { schoolId: "brhs", name: "Bridgeport Regional HS", readinessPct: 64, students: 178, topGap: "Self-Advocacy", trend: "flat" },
  { schoolId: "nwhs", name: "New Haven West HS", readinessPct: 71, students: 152, topGap: "Independent Living", trend: "up" },
  { schoolId: "swhs", name: "Stamford South HS", readinessPct: 55, students: 133, topGap: "Employment", trend: "down" },
  { schoolId: "wthhs", name: "Waterbury Tech HS", readinessPct: 88, students: 96, topGap: "Community", trend: "up" },
];

type SortKey = "name" | "readiness" | "trend";

interface Props {
  schools?: SchoolMetric[];
  className?: string;
}

const TREND_ORDER: Record<NonNullable<SchoolMetric["trend"]>, number> = { up: 0, flat: 1, down: 2 };

export function SchoolComparisonChart({ schools = SAMPLE, className }: Props) {
  const [sort, setSort] = useState<SortKey>("readiness");
  const sorted = useMemo(() => {
    const copy = [...schools];
    if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "readiness") copy.sort((a, b) => b.readinessPct - a.readinessPct);
    if (sort === "trend") copy.sort((a, b) => TREND_ORDER[a.trend ?? "flat"] - TREND_ORDER[b.trend ?? "flat"]);
    return copy;
  }, [schools, sort]);

  return (
    <section aria-label="School comparison" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">School-By-School Readiness</h3>
          <p className="text-sm text-muted-foreground">Hover a bar for gap detail.</p>
        </div>
        <div className="flex gap-1 text-xs">
          {(["readiness", "name", "trend"] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={cn(
                "rounded-full border px-2 py-1 capitalize transition",
                sort === k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </header>

      <ul className="space-y-3">
        {sorted.map((s) => (
          <li key={s.schoolId} className="group">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{s.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {s.trend === "up" && <ArrowUp className="h-3.5 w-3.5 text-primary" />}
                {s.trend === "down" && <ArrowDown className="h-3.5 w-3.5 text-destructive" />}
                {s.trend === "flat" && <Minus className="h-3.5 w-3.5" />}
                {s.readinessPct}% · {s.students} students
              </span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="tf-bar-grow h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                style={{ width: `${s.readinessPct}%` }}
                aria-hidden
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              Top gap: {s.topGap ?? "—"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
