import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * DashboardRowList — flat, divided list of feature entries. Replaces the
 * stacked-card pattern outside the Workspace section. Reads as a compact
 * command-center row list: icon + title + one-line description + status
 * chip + inline link, separated by hairlines, no card wrappers.
 *
 * Each row is a real link into an existing feature page — nothing here
 * introduces new routes or duplicates entry points already surfaced in
 * the Workspace grid above. Deeper detail lives on the destination page.
 */
export interface DashboardRow {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  /** Optional short status text (e.g. "94% compliant", "12 to review"). */
  status?: string;
  /** Optional tone for the status chip. */
  tone?: "neutral" | "success" | "warn" | "risk";
}

const TONE: Record<NonNullable<DashboardRow["tone"]>, string> = {
  neutral: "bg-muted text-foreground/80 ring-border/60",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  risk: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
};

export function DashboardRowList({ rows }: { rows: DashboardRow[] }) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-background/40">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <li key={row.title}>
            <Link
              to={row.to}
              className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-muted/50 sm:px-4 sm:py-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="truncate text-[13.5px] font-semibold text-foreground">
                    {row.title}
                  </span>
                  {row.status ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ${
                        TONE[row.tone ?? "neutral"]
                      }`}
                    >
                      {row.status}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 line-clamp-1 block text-[12px] text-muted-foreground">
                  {row.description}
                </span>
              </span>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
