import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generatePathwayReport,
  type GeneratedReport,
  type PathwayOption,
  type ReportBlock,
} from "@/lib/demo/pathway-engine";
import type { DemoProfile } from "@/lib/demo/demo-profiles";

const CATEGORY_LABEL: Record<PathwayOption["category"], string> = {
  education: "Education",
  work_based_learning: "Work-Based Learning",
  enrichment: "Enrichment",
  independent_living: "Independent Living",
  advocacy: "Self-Advocacy",
};

/**
 * Age-aware Pathway Report renderer.
 *
 * Reads a fictional DemoProfile, runs it through the pure pathway engine,
 * and lays out the seven required explanation sections + the filtered
 * pathway options. Every screen element is derived from the profile, so
 * switching students in the header immediately swaps the report.
 */
export function PathwayReport({ profile }: { profile: DemoProfile }) {
  const report = generatePathwayReport(profile);
  return (
    <section
      aria-label={`Pathway report for ${profile.shortName}`}
      data-demo-report-profile={profile.id}
      className="space-y-8"
    >
      <ReportHeader report={report} profile={profile} />
      <ReportBlocks blocks={report.blocks} />
      <PathwayOptions options={report.pathwayOptions} shortName={profile.shortName} />
      <RevisitFooter report={report} profile={profile} />
    </section>
  );
}

function ReportHeader({
  report,
  profile,
}: {
  report: GeneratedReport;
  profile: DemoProfile;
}) {
  return (
    <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Pathway Report · Fictional Demo
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
            {report.headline}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{report.subheadline}</p>
          <p className="mt-3 max-w-2xl text-sm text-foreground/80">{report.focus}.</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {profile.product === "transitionforward" ? "TransitionForward" : "BridgeForward"}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Planning horizon · {report.horizonMonths} months
          </p>
          <p className="text-xs text-muted-foreground">
            Revisit every {report.revisitCadenceMonths} months
          </p>
        </div>
      </div>
    </header>
  );
}

function ReportBlocks({ blocks }: { blocks: ReportBlock[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {blocks.map((b) => (
        <Card key={b.section} data-demo-report-section={b.section}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{b.heading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/85">
            <p>{b.body}</p>
            {b.bullets && b.bullets.length > 0 && (
              <ul className="list-disc space-y-1.5 pl-5">
                {b.bullets.map((bl, i) => (
                  <li key={i}>{bl}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PathwayOptions({
  options,
  shortName,
}: {
  options: PathwayOption[];
  shortName: string;
}) {
  if (options.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pathway Options</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No age-appropriate options matched the current filters for {shortName}.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          Recommended Pathway Options
        </h2>
        <p className="text-xs text-muted-foreground">
          {options.length} age-appropriate {options.length === 1 ? "option" : "options"}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {options.map((opt) => (
          <Card key={opt.id} data-demo-pathway-option={opt.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base leading-snug">{opt.title}</CardTitle>
                <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider">
                  {CATEGORY_LABEL[opt.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/85">
              <p className="italic text-foreground/75">{opt.fitSummary}</p>
              <dl className="grid gap-2 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                    Ahead
                  </dt>
                  <dd className="mt-0.5 text-foreground/85">{opt.ahead}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                    Beside
                  </dt>
                  <dd className="mt-0.5 text-foreground/85">{opt.beside}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                    Behind
                  </dt>
                  <dd className="mt-0.5 text-foreground/85">{opt.behind}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RevisitFooter({
  report,
  profile,
}: {
  report: GeneratedReport;
  profile: DemoProfile;
}) {
  return (
    <footer className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">Age-aware safeguards active.</span>{" "}
        {profile.shortName} is in {profile.demographics.gradeLabel}, so the engine
        excluded themes that don't belong yet:{" "}
        <span className="font-medium text-foreground/80">
          {report.disallowedThemesApplied.map((t) => t.replace(/_/g, " ")).join(", ")}
        </span>
        .
      </p>
    </footer>
  );
}
