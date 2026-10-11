import { PublicationPage, PublicationSidebar, PublicationChecklist } from "@/components/publication/PublicationPage";
import { toTitleCase } from "@/lib/title-case";

export type ReportOverviewProps = {
  summary: string;
  strengths: readonly string[];
  direction?: { label: string; title: string; explanation: string };
  nextSteps: { label: string; items: string[] };
};

/** Shared document overview; callers supply their own recorded content and role-specific preview. */
export function ReportOverview({ summary, strengths, direction, nextSteps }: ReportOverviewProps) {
  return <PublicationPage kicker="At a Glance" chapter="At a Glance"
    dek="The big picture — what we know, where things are headed, and where to start." folio="p. 01">
    <div data-report-overview className="pub-spread">
      <div className="pub-spread-lead"><div>
        <p className="text-sm leading-relaxed text-foreground/85">{summary}</p>
        {strengths.length > 0 && <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Top Strengths</p>
          <PublicationChecklist items={[...strengths]} />
        </div>}
        {direction && <div className="mt-6 border-t border-[color:var(--pub-rule-soft)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">{direction.label}</p>
          <p className="font-display text-lg leading-snug">{toTitleCase(direction.title)}</p>
          <p data-report-best-fit-explanation className="mt-1 text-sm text-muted-foreground">{direction.explanation}</p>
        </div>}
      </div></div>
      <div className="pub-spread-side">
        <PublicationSidebar as="div" label={nextSteps.label}>
          {nextSteps.items.length > 0 ? <PublicationChecklist items={nextSteps.items} />
            : <p className="text-sm text-muted-foreground">No next steps are recorded for this view. Review the Action Plan with your team.</p>}
        </PublicationSidebar>
      </div>
    </div>
  </PublicationPage>;
}
