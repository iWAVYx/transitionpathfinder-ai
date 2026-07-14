import type { ReactNode } from "react";
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
 * Shared role-dashboard shell. Renders ONE compact header (identity + next
 * best action + Pathway Report tie-in), then the role's polished dashboard
 * (children), then optional spokes for hubs that don't ship an OverviewGrid.
 *
 * This replaces the older two-block layout (large pillar header + separate
 * spokes grid) that was creating two competing "dashboard" sections per
 * role page.
 */
export function HubShell({ hub, children, hideSpokes = false }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      {/* Command-center header — accent bar + identity + primary action. */}
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-accent/[0.06] shadow-sm">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-accent/60" aria-hidden />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
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
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/70 px-2.5 py-0.5 text-[11px] text-foreground/80">
              <FileText className="h-3 w-3 text-primary" aria-hidden />
              {hub.pathwayConnection}
            </p>
          </div>
          <div className="flex lg:justify-end">
            <Link
              to={hub.nextAction.to}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-lift"
            >
              {toTitleCase(hub.nextAction.label)}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      {/* Role dashboard body (OverviewGrid + status cards + StageJourneyCard). */}
      <div className="mt-6 space-y-dashboard-lg sm:mt-8">{children}</div>

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
