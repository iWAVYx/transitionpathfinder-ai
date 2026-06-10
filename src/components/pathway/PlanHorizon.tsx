import { CheckCircle2, Clock, Target, UserRound, Trophy, Users, GraduationCap, Gauge } from "lucide-react";
import type { RichPlanStep, PlanHorizon } from "@/lib/demo-extended-plans";
import { HORIZON_META } from "@/lib/demo-extended-plans";
import { cn } from "@/lib/utils";

export function PlanHorizonTabs({
  value,
  onChange,
  counts,
  className,
}: {
  value: PlanHorizon;
  onChange: (v: PlanHorizon) => void;
  counts: Record<PlanHorizon, number>;
  className?: string;
}) {
  const horizons: PlanHorizon[] = ["thirty", "sixty", "ninety"];
  return (
    <div className={cn("inline-flex rounded-2xl border bg-card p-1 shadow-soft", className)}>
      {horizons.map((h) => {
        const meta = HORIZON_META[h];
        const active = value === h;
        return (
          <button
            key={h}
            type="button"
            onClick={() => onChange(h)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-start rounded-xl px-3 py-1.5 text-left transition-colors sm:px-4 sm:py-2",
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            <span className="font-display text-sm sm:text-base leading-tight">{meta.days} days</span>
            <span className={cn("text-[10px] uppercase tracking-wider", active ? "opacity-85" : "text-muted-foreground")}>
              {counts[h]} weekly steps
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RichPlanStepCard({ step }: { step: RichPlanStep }) {
  return (
    <li className="relative rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Week</span>
          <span className="font-display text-xl leading-none">{step.week}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {step.focus}
          </p>
          <h3 className="mt-1 font-display text-lg leading-snug text-foreground">{step.action}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Chip icon={<UserRound className="h-3 w-3" />}>{step.owner}</Chip>
            <Chip icon={<Clock className="h-3 w-3" />}>{step.time}</Chip>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr,auto] sm:items-start">
        <ul className="space-y-2">
          {step.details.map((d) => (
            <li key={d} className="flex items-start gap-2 text-sm leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
              <span className="text-foreground/85">{d}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-3 text-xs leading-relaxed text-foreground/85 dark:bg-emerald-950/10 sm:max-w-[18rem]">
          <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <Trophy className="h-3 w-3" /> Success looks like
          </p>
          <p className="mt-1">{step.outcome}</p>
        </div>
      </div>

      {(step.familyActions?.length || step.teacherActions?.length || step.readiness) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {step.familyActions && step.familyActions.length > 0 && (
            <ActionList
              title="Family actions"
              icon={<Users className="h-3 w-3" />}
              tone="primary"
              items={step.familyActions}
            />
          )}
          {step.teacherActions && step.teacherActions.length > 0 && (
            <ActionList
              title="Teacher / case manager actions"
              icon={<GraduationCap className="h-3 w-3" />}
              tone="amber"
              items={step.teacherActions}
            />
          )}
          {step.readiness && <ReadinessTile readiness={step.readiness} />}
        </div>
      )}
    </li>
  );
}

function ActionList({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: "primary" | "amber";
}) {
  const headerCls =
    tone === "primary"
      ? "text-primary"
      : "text-amber-700 dark:text-amber-300";
  const borderCls =
    tone === "primary"
      ? "border-primary/25 bg-primary/[0.04]"
      : "border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10";
  return (
    <div className={`rounded-2xl border ${borderCls} p-3`}>
      <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${headerCls}`}>
        {icon}
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/85">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadinessTile({
  readiness,
}: {
  readiness: { category: string; level: "emerging" | "developing" | "progressing" | "ready"; metric: string };
}) {
  const pct =
    readiness.level === "ready"
      ? 90
      : readiness.level === "progressing"
        ? 70
        : readiness.level === "developing"
          ? 45
          : 20;
  const levelLabel =
    readiness.level.charAt(0).toUpperCase() + readiness.level.slice(1);
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-3 text-foreground/85 dark:bg-emerald-950/10">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
        <Gauge className="h-3 w-3" /> Readiness metric
      </p>
      <p className="mt-2 text-xs font-medium">{readiness.category}</p>
      <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{levelLabel}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed">{readiness.metric}</p>
    </div>
  );
}

export function SimpleWeekCard({ week, action }: { week: number; action: string }) {
  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <Target className="h-3 w-3" /> Week {week}
      </p>
      <p className="mt-1 text-sm text-foreground">{action}</p>
    </li>
  );
}

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
      {icon}
      {children}
    </span>
  );
}
