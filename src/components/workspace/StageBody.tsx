import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  REPORT_SECTION_LABELS,
  type WorkspaceStage,
} from "@/lib/workspace/stages";

/**
 * StageBody — narrative canvas for a single stage. Renders below the
 * StageHeader inside WorkspaceShell. Default content lists the report
 * sections this stage produces and links to the underlying work
 * surface; pages can override by passing children.
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
    <section className="mt-10 grid gap-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          {children ?? (
            <p className="text-lg leading-relaxed text-foreground/90">
              This stage is where the team gathers what belongs to{" "}
              <em>{stage.title.toLowerCase()}</em>. The information captured
              here flows directly into the Pathway Report and the next
              stage's work — nothing lives in isolation.
            </p>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-muted/40 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Feeds the Pathway Report
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {stage.reportSections.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 leading-snug text-foreground"
              >
                <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{REPORT_SECTION_LABELS[s]}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[46ch]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Do the work
          </p>
          <p className="mt-2 font-display text-xl text-foreground">
            Open the {stage.title} surface
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {workSurfaceLabel}
          </p>
        </div>
        <Link
          to={workSurfaceHref as never}
          className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary/90 sm:self-auto"
        >
          Go there <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
