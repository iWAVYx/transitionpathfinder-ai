import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, FileText } from "lucide-react";

import type { HubDefinition } from "@/lib/hubs/registry";
import { toTitleCase } from "@/lib/title-case";
import { HubSpokeGrid } from "./HubSpokeGrid";
import { RelatedLinksRail } from "./RelatedLinksRail";


interface Props {
  hub: HubDefinition;
  /** Optional extra content rendered between the compact header and the spokes. */
  children?: ReactNode;
  /**
   * Hide the "Tools, Resources & Next Steps" spoke grid at the bottom.
   * Role hubs that render their own polished OverviewGrid (School, District,
   * Family, Educator, Student, Partner) pass this — the spoke grid otherwise
   * duplicates feature entry points already surfaced above. Admin hub keeps
   * the spokes because it has no OverviewGrid of its own.
   */
  hideSpokes?: boolean;
}

/**
 * Per-role accent palette. Each entry overrides --primary and --accent
 * inside the hub scope, so every `bg-primary/*`, `text-primary`,
 * `border-primary/*` and gradient inside the tile primitives shifts to
 * the role's color. Values are oklch to match the token system.
 */
const ROLE_ACCENTS: Record<
  string,
  { primary: string; primaryFg: string; accent: string; label: string }
> = {
  "student-planning":    { primary: "oklch(0.60 0.14 235)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.90 0.06 230)", label: "student" },
  "family-planning":     { primary: "oklch(0.60 0.16 15)",  primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 20)",  label: "family" },
  "caseload-planning":   { primary: "oklch(0.55 0.13 160)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 155)", label: "educator" },
  "school-implementation":{primary: "oklch(0.55 0.16 290)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 290)", label: "school" },
  "district-strategy":   { primary: "oklch(0.48 0.16 265)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.92 0.05 265)", label: "district" },
  "partner-opportunity": { primary: "oklch(0.62 0.15 55)",  primaryFg: "oklch(0.18 0.04 250)",  accent: "oklch(0.92 0.06 55)",  label: "partner" },
  "platform-operations": { primary: "oklch(0.42 0.05 250)", primaryFg: "oklch(0.99 0.005 220)", accent: "oklch(0.90 0.02 250)", label: "admin" },
};

/**
 * Shared role-dashboard shell. Renders ONE compact header (identity + next
 * best action + Pathway Report tie-in), then the role's polished dashboard
 * (children), then optional spokes for hubs that don't ship an OverviewGrid.
 *
 * The outer wrapper scopes `--primary` and `--accent` to the role's color,
 * so every downstream tile / pill / gradient / button using those tokens
 * picks up the role tint automatically.
 */
export function HubShell({ hub, children, hideSpokes = false }: Props) {
  const accent = ROLE_ACCENTS[hub.id];
  const style = accent
    ? ({
        ["--primary" as string]: accent.primary,
        ["--primary-foreground" as string]: accent.primaryFg,
        ["--accent" as string]: accent.accent,
      } as CSSProperties)
    : undefined;
  return (
    <div
      data-role-accent={accent?.label ?? "default"}
      style={style}
      className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8"
    >

      {/* Header Zone */}
      <header className="border-b border-border/70 pb-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Compass className="h-3 w-3" aria-hidden /> Role Workspace
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-[26px]">
              {toTitleCase(hub.title)}
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-snug text-foreground/80">
              <span className="font-medium text-foreground">{hub.who}</span>{" "}
              <span className="text-muted-foreground">{hub.problem}</span>
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 border-l border-primary/30 pl-2.5 text-[11px] text-foreground/80">
              <FileText className="h-3 w-3 text-primary" aria-hidden />
              {hub.pathwayConnection}
            </p>
          </div>
          <div className="flex lg:justify-end">
            <Link
              to={hub.nextAction.to}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {toTitleCase(hub.nextAction.label)}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        {/* Compact overview strip — derived from the hub definition, no fabricated data. */}
      </header>

      {/* Summary Zone */}
      <dl className="mt-5 grid grid-cols-3 divide-x divide-border/70 border-y border-border/70">
          {[
            { label: "Feature Areas", value: hub.spokes.length },
            { label: "Feeds Pathway Report", value: hub.spokes.filter((s) => s.feedsReport).length },
            { label: "Related Hubs", value: hub.related.length },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-2.5 sm:px-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

      {/* Role dashboard body. Clear separation between the approved Workspace
          section and the surrounding dashboard zones — larger vertical
          rhythm so sections read as distinct rather than one long stack. */}
      <div className="mt-6 space-y-10 sm:mt-8 sm:space-y-12">{children}</div>


      {/* Optional spokes — only for hubs without a polished OverviewGrid. */}
      {!hideSpokes && (
        <section className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            What Belongs Here
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Tools, Resources &amp; Next Steps
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each card is a real surface in the product. Everything feeds the Pathway Report.
          </p>
          <div className="mt-5 sm:mt-6">
            <HubSpokeGrid spokes={hub.spokes} />
          </div>
        </section>
      )}

      {/* Related rail */}
      <section className="mt-10">
        <RelatedLinksRail hub={hub} />
      </section>
    </div>
  );
}
