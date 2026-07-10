import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  REPORT_SECTION_LABELS,
  type WorkspaceStage,
} from "@/lib/workspace/stages";
import { StageSamplePanel } from "./StageSamplePanel";
import { StageRoleValueStrip } from "./StageRoleValueStrip";


/**
 * StageBody — narrative canvas for a single stage.
 *
 * In signed-in mode, a "Do The Work" panel links to the live work
 * surface. In demo mode (`expandInPlace`), no link is rendered; opening
 * the full sample screen expands the sample panel inline instead, so
 * the public demo stays on the Workspace Tour.
 *
 * Title Case is used for panel/section titles; sentence case for
 * narrative copy — per the project style rules.
 */
export function StageBody({
  stage,
  workSurfaceHref,
  workSurfaceLabel,
  expandInPlace = false,
  defaultExpanded = false,
  children,
}: {
  stage: WorkspaceStage;
  /** Live work-surface route. Omit (or set expandInPlace) in the demo. */
  workSurfaceHref?: string;
  workSurfaceLabel?: string;
  expandInPlace?: boolean;
  /** In demo mode, start with the full-sample panel already expanded. */
  defaultExpanded?: boolean;
  children?: ReactNode;
}) {
  const showWorkSurface = !expandInPlace && !!workSurfaceHref;
  return (
    <section className="mt-10 grid gap-8">
      {children && (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          {children}
        </div>
      )}

      <StageSamplePanel
        stage={stage}
        fullSampleHref={expandInPlace ? undefined : workSurfaceHref}
        fullSampleLabel="Open Full Sample Screen"
        expandInPlace={expandInPlace}
        defaultExpanded={defaultExpanded}
      />

      <StageRoleValueStrip stageId={stage.id} />



      <div
        className={
          showWorkSurface
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
            : "grid gap-6"
        }
      >
        {showWorkSurface && (
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
        )}

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
