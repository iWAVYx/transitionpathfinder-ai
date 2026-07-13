import { Activity, Users2, TrendingUp, AlertTriangle, Download, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";
import { Button } from "@/components/ui/button";

export interface ImplementationHealthCardProps {
  scope?: "school" | "district";
  scopeName?: string;
  healthScore?: number; // 0-100
  completionRate?: number; // 0-100
  readinessDelta?: number;
  activeUsers?: { role: string; used: number; total: number }[];
  risks?: string[];
  nextRecommendedStep?: string;
  onExport?: () => void;
  className?: string;
}

const DEFAULT_USERS = [
  { role: "Educators", used: 24, total: 31 },
  { role: "Coordinators", used: 6, total: 7 },
  { role: "Families invited", used: 82, total: 118 },
  { role: "Partners", used: 4, total: 9 },
];

export function ImplementationHealthCard({
  scope = "school",
  scopeName = "Riverside High",
  healthScore = 78,
  completionRate = 64,
  readinessDelta = 9,
  activeUsers = DEFAULT_USERS,
  risks = [
    "3 pathway reports haven't been updated in 90+ days",
    "2 students missing a signed transition consent",
    "1 educator hasn't logged in this month",
  ],
  nextRecommendedStep = "Schedule quarterly transition review with the 3 stale reports before the next IEP window.",
  onExport,
  className,
}: ImplementationHealthCardProps) {
  const tone =
    healthScore >= 75
      ? "bg-emerald-100 text-emerald-900"
      : healthScore >= 50
        ? "bg-amber-100 text-amber-900"
        : "bg-destructive/10 text-destructive";

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
      aria-labelledby="impl-health-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tf-eyebrow">{toTitleCase(`${scope} Implementation Health`)}</p>
          <h3
            id="impl-health-heading"
            className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl"
          >
            {toTitleCase(scopeName)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The ROI picture: how much of the platform is in use, what's improving, and what needs attention.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export Summary
        </Button>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Activity className="h-4 w-4" />}
          label="Health Score"
          value={`${healthScore}`}
          suffix="/ 100"
          tone={tone}
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Readiness Trend"
          value={`${readinessDelta >= 0 ? "+" : ""}${readinessDelta}`}
          suffix="pts (90d)"
        />
        <StatTile
          icon={<Users2 className="h-4 w-4" />}
          label="Plan Completion"
          value={`${completionRate}%`}
          suffix="of active students"
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {toTitleCase("Staff & Family Usage")}
          </p>
          <ul className="mt-3 space-y-2.5">
            {activeUsers.map((u) => {
              const pct = Math.round((u.used / Math.max(u.total, 1)) * 100);
              return (
                <li key={u.role}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{u.role}</span>
                    <span className="text-muted-foreground">
                      {u.used}/{u.total} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {toTitleCase("Risk Flags")}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {risks.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-primary/5 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {toTitleCase("Next Recommended Step")}
          </p>
          <p className="mt-1 text-sm">{nextRecommendedStep}</p>
        </div>
        <Button size="sm">
          Take Action <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wider">
          {toTitleCase(label)}
        </p>
      </div>
      <p className="mt-2 font-display text-3xl leading-none">
        {value}
        {suffix && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
      {tone && (
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
            tone,
          )}
        >
          {value && Number(value) >= 75 ? "On track" : Number(value) >= 50 ? "Watch" : "At risk"}
        </span>
      )}
    </div>
  );
}
