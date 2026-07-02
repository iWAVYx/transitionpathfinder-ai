import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Users, Target, FileText } from "lucide-react";

import type { HubDefinition } from "@/lib/hubs/registry";
import { HubSpokeGrid } from "./HubSpokeGrid";
import { RelatedLinksRail } from "./RelatedLinksRail";

interface Props {
  hub: HubDefinition;
  /** Optional extra content rendered between the pillar header and spokes. */
  children?: ReactNode;
}

/**
 * Shared pillar-page shell. Every hub uses this so the architecture feels
 * like a system rather than 15 bespoke pages.
 */
export function HubShell({ hub, children }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      {/* Pillar header — Who / Problem / Next */}
      <header className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 shadow-soft sm:p-12">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Compass className="h-3.5 w-3.5" aria-hidden /> Content Hub
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          {hub.title}
        </h1>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border bg-background/60 p-5">
            <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Users className="h-3.5 w-3.5" aria-hidden /> Who This Is For
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-foreground/85">{hub.who}</dd>
          </div>
          <div className="rounded-2xl border bg-background/60 p-5">
            <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Target className="h-3.5 w-3.5" aria-hidden /> What It Solves
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-foreground/85">{hub.problem}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={hub.nextAction.to}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-lift"
          >
            {hub.nextAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-4 py-2 text-xs text-foreground/80">
            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
            {hub.pathwayConnection}
          </span>
        </div>
      </header>

      {children}

      {/* Spokes */}
      <section className="mt-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          What Belongs Here
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Tools, Resources &amp; Next Steps
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Each card is a real surface in the product or demo. Use them in any order —
          everything feeds the Pathway Report.
        </p>
        <div className="mt-6">
          <HubSpokeGrid spokes={hub.spokes} />
        </div>
      </section>

      {/* Related rail */}
      <section className="mt-14">
        <RelatedLinksRail hub={hub} />
      </section>
    </div>
  );
}
