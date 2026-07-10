import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  REPORT_SECTION_LABELS,
  type WorkspaceStage,
} from "@/lib/workspace/stages";
import { StageSamplePanel } from "./StageSamplePanel";

/**
 * StageBody — narrative canvas for a single stage. Renders below the
 * StageHeader inside WorkspaceShell. The stage's interactive Sample
 * Screen is embedded inline so it visually belongs to the stage flow
 * instead of floating as a disconnected mockup; the "Feeds the Pathway
 * Report" rail sits alongside it so input → insight → action stays
 * legible on the same page.
 *
 * Title Case is used for panel/section titles; sentence case for
 * narrative copy — per the project style rules.
 */
export function StageBody({
  stage,
  workSurfaceHref,
  workSurfaceLabel,
  children,
}: {
  stage: WorkspaceStage;
  workSurfaceHref: string;
  workSurfaceLabel: string;
  children?: ReactNode;
}) {
  return (
    <section className="mt-10 grid gap-8">
      {/* Optional stage-specific narrative from the route */}
      {children && (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          {children}
        </div>
      )}

      {/* Interactive sample screen, embedded in the stage flow. */}
      <StageSamplePanel
        stage={stage}
        fullSampleHref={workSurfaceHref}
        fullSampleLabel="Open Full Sample Screen"
      />

      {/* Report + surface rail — kept alongside so the flow reads as
          Sample Screen → Report Sections → Open Work Surface. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Do The Work
          </p>
          <p className="mt-2 font-display text-xl text-foreground">
            Open The {stage.title} Surface
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {workSurfaceLabel}
          </p>
          <Link
            to={workSurfaceHref as never}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary/90"
          >
            Go To Work Surface
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <aside className="rounded-3xl border border-border bg-muted/40 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Feeds The Pathway Report
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {stage.reportSections.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 leading-snug text-foreground"
              >
                <span
                  aria-hidden
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                <span>{REPORT_SECTION_LABELS[s]}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
