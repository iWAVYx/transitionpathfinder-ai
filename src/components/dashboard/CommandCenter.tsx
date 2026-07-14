import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export type CommandMetric = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "warn" | "risk";
};

export type CommandRow = {
  icon?: LucideIcon;
  label: string;
  value?: string | number;
  detail?: string;
  to?: string;
  status?: string;
  tone?: "neutral" | "success" | "warn" | "risk";
};

const TONE: Record<NonNullable<CommandMetric["tone"]>, string> = {
  neutral: "text-foreground",
  success: "text-emerald-700 dark:text-emerald-300",
  warn: "text-amber-700 dark:text-amber-300",
  risk: "text-destructive",
};

const STATUS_TONE: Record<NonNullable<CommandRow["tone"]>, string> = {
  neutral: "bg-muted text-foreground/80 ring-border/60",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  risk: "bg-destructive/10 text-destructive ring-destructive/20",
};

export function CommandMetricStrip({ items }: { items: CommandMetric[] }) {
  return (
    <dl className="grid divide-y divide-border/60 border-y border-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-1 py-3 sm:px-4">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item.label}
          </dt>
          <dd className={`mt-1 font-display text-xl font-semibold tabular-nums ${TONE[item.tone ?? "neutral"]}`}>
            {item.value}
          </dd>
          {item.hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function CommandRows({ rows }: { rows: CommandRow[] }) {
  return (
    <ul className="divide-y divide-border/60 border-y border-border/70">
      {rows.map((row) => {
        const Icon = row.icon;
        const content = (
          <>
            {Icon ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-foreground">{row.label}</span>
                {row.status ? (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ${STATUS_TONE[row.tone ?? "neutral"]}`}>
                    {row.status}
                  </span>
                ) : null}
              </span>
              {row.detail ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{row.detail}</span> : null}
            </span>
            {row.value ? <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{row.value}</span> : null}
            {row.to ? <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
          </>
        );

        return (
          <li key={`${row.label}-${row.to ?? row.value ?? "row"}`}>
            {row.to ? (
              <Link to={row.to as never} className="group flex min-h-12 items-center gap-2 py-2.5 transition hover:bg-muted/35 sm:px-2">
                {content}
              </Link>
            ) : (
              <div className="flex min-h-12 items-center gap-2 py-2.5 sm:px-2">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CommandZone({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <header className="border-b border-border/60 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h2 className="mt-0.5 font-display text-base font-semibold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function WorkspaceZone({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="Workspace" className="border-y border-primary/25 bg-primary/[0.035] py-5 sm:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-primary/15 pb-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">Workspace</p>
          <h2 className="font-display text-lg tracking-tight">Your Role Dashboard</h2>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Primary work area</span>
      </div>
      <div data-preserve-workspace-internals>{children}</div>
    </section>
  );
}