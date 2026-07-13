import { TrendingUp, CheckCircle2, FileText, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";

type Point = { label: string; value: number };

export interface ProgressOverTimeCardProps {
  studentName?: string;
  sparkline?: Point[];
  milestonesCompleted?: number;
  reportVersions?: number;
  actionCompletionRate?: number; // 0-100
  sinceLastMeeting?: string[];
  className?: string;
}

const DEFAULT_SPARK: Point[] = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 48 },
  { label: "Mar", value: 55 },
  { label: "Apr", value: 61 },
  { label: "May", value: 67 },
  { label: "Jun", value: 74 },
];

export function ProgressOverTimeCard({
  studentName = "This Student",
  sparkline = DEFAULT_SPARK,
  milestonesCompleted = 7,
  reportVersions = 3,
  actionCompletionRate = 68,
  sinceLastMeeting = [
    "Uploaded updated IEP (April draft)",
    "Completed 2 self-advocacy voice prompts",
    "Matched with 1 new PartnerForward opportunity",
  ],
  className,
}: ProgressOverTimeCardProps) {
  const max = Math.max(...sparkline.map((p) => p.value), 1);
  const first = sparkline[0]?.value ?? 0;
  const last = sparkline[sparkline.length - 1]?.value ?? 0;
  const delta = last - first;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
      aria-labelledby="progress-over-time-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tf-eyebrow">{toTitleCase("Progress Over Time")}</p>
          <h3
            id="progress-over-time-heading"
            className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl"
          >
            {toTitleCase(`${studentName}'s Momentum`)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A quick read on readiness change, activity, and follow-through.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            delta >= 0
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900",
          )}
        >
          <TrendingUp className="h-3 w-3" aria-hidden />
          {delta >= 0 ? "+" : ""}
          {delta} readiness pts
        </span>
      </header>

      {/* Sparkline */}
      <div
        className="mt-5 flex h-24 items-end gap-1"
        role="img"
        aria-label={`Readiness trend from ${first} to ${last}`}
      >
        {sparkline.map((p) => {
          const h = Math.max(6, Math.round((p.value / max) * 100));
          return (
            <div key={p.label} className="flex-1">
              <div
                className="rounded-t bg-primary/70"
                style={{ height: `${h}%` }}
                title={`${p.label}: ${p.value}`}
              />
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                {p.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Metrics */}
      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Metric
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Milestones"
          value={String(milestonesCompleted)}
        />
        <Metric
          icon={<FileText className="h-4 w-4" />}
          label="Report Versions"
          value={String(reportVersions)}
        />
        <Metric
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Action Follow-Through"
          value={`${actionCompletionRate}%`}
        />
      </dl>

      {/* Since last meeting */}
      {sinceLastMeeting.length > 0 && (
        <div className="mt-5 rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {toTitleCase("Since Last Meeting")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {sinceLastMeeting.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <dt className="text-[11px] font-medium uppercase tracking-wider">
          {toTitleCase(label)}
        </dt>
      </div>
      <dd className="mt-1 font-display text-xl">{value}</dd>
    </div>
  );
}
