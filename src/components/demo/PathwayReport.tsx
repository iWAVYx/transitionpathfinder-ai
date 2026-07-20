import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generatePathwayReport,
  type AlternativePathway,
  type EnrichedNextStep,
  type GeneratedReport,
  type PathwayConflict,
  type PathwayOption,
  type ReportBlock,
} from "@/lib/demo/pathway-engine";
import type { DemoProfile } from "@/lib/demo/demo-profiles";
import { OpportunityMatches } from "@/components/demo/OpportunityMatches";

const OWNER_LABEL: Record<EnrichedNextStep["owner"], string> = {
  family: "Family",
  student: "Student",
  school_team: "School Team",
  shared: "Shared",
};

const TIMEFRAME_LABEL: Record<EnrichedNextStep["timeframe"], string> = {
  this_month: "This Month",
  this_semester: "This Semester",
  this_year: "This Year",
};

const CATEGORY_LABEL: Record<PathwayOption["category"], string> = {
  education: "Education",
  work_based_learning: "Work-Based Learning",
  enrichment: "Enrichment",
  independent_living: "Independent Living",
  advocacy: "Self-Advocacy",
};

/** Workstream 1.1 audiences the demo report can be framed for. */
export type DemoReportAudience = "student" | "family" | "educator";

/**
 * Audience-tailored framing. Same underlying pathway data, different
 * point-of-view intro. Copy stays second person ("your", "you") for the
 * student view, and switches to "your student" / "this student" for the
 * family and educator lenses.
 */
function audienceFrame(
  audience: DemoReportAudience,
  profile: DemoProfile,
): { eyebrow: string; heading: string; body: string } {
  const name = profile.shortName;
  switch (audience) {
    case "family":
      return {
        eyebrow: "For Family",
        heading: `What this means for ${name}'s family`,
        body: `A plain-language read on what the engine recommended for ${name}, what the next family conversation could be, and what to bring to the next planning meeting.`,
      };
    case "educator":
      return {
        eyebrow: "For Educator",
        heading: `What this means for ${name}'s team`,
        body: `The team-facing view: which supports are already working, where evidence is thin, and how the recommendations connect to ${name}'s current IEP goals.`,
      };
    case "student":
    default:
      return {
        eyebrow: "For You",
        heading: `Your Pathway, ${name}`,
        body: `Written for you first. Every option below was filtered against your grade, your voice, and what you've said matters most right now.`,
      };
  }
}

/**
 * Age-aware Pathway Report renderer.
 *
 * Reads a fictional DemoProfile, runs it through the pure pathway engine,
 * and lays out the seven required explanation sections + the filtered
 * pathway options. Every screen element is derived from the profile, so
 * switching students in the header immediately swaps the report.
 *
 * The optional `audience` prop (Workstream 1.1) frames the report from a
 * chosen point of view. Pathway option cards are identical across
 * audiences — only the intro framing changes.
 */
export function PathwayReport({
  profile,
  audience = "student",
}: {
  profile: DemoProfile;
  audience?: DemoReportAudience;
}) {
  const report = generatePathwayReport(profile);
  const frame = audienceFrame(audience, profile);
  return (
    <section
      aria-label={`Pathway report for ${profile.shortName} (${audience} view)`}
      data-demo-report-profile={profile.id}
      data-demo-report-audience={audience}
      className="space-y-8"
    >
      <ReportHeader report={report} profile={profile} />
      <AudienceFrame frame={frame} />
      <ReportBlocks blocks={report.blocks} />
      <NextStepsList steps={report.nextSteps} />
      <PathwayOptions options={report.pathwayOptions} shortName={profile.shortName} />
      <AlternativePathways items={report.alternativePathways} />
      <ConflictsList items={report.conflicts} shortName={profile.shortName} />
      <OpportunityMatches compact limit={3} />
      <RevisitFooter report={report} profile={profile} />
    </section>
  );
}

function AudienceFrame({
  frame,
}: {
  frame: { eyebrow: string; heading: string; body: string };
}) {
  return (
    <aside
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      aria-label="Audience framing"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        {frame.eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{frame.heading}</h2>
      <p className="mt-1 text-sm text-foreground/80">{frame.body}</p>
    </aside>
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
            {b.body && <p>{b.body}</p>}
            {b.bullets && b.bullets.length > 0 && (
              <ul className="list-disc space-y-1.5 pl-5">
                {b.bullets.map((bl, i) => (
                  <li key={i}>{bl}</li>
                ))}
              </ul>
            )}
            {b.missing && (
              <div
                data-demo-report-missing={b.section}
                className="rounded-md border border-dashed border-amber-400/60 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <p className="font-semibold uppercase tracking-wide">
                  Missing / Uncertain
                </p>
                <p className="mt-1">{b.missing.reason}</p>
                {b.missing.needed.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    {b.missing.needed.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NextStepsList({ steps }: { steps: EnrichedNextStep[] }) {
  if (steps.length === 0) return null;
  return (
    <section aria-label="Recommended next steps" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Next Steps</h2>
        <p className="text-xs text-muted-foreground">
          {steps.length} recommendation{steps.length === 1 ? "" : "s"} · review-by
          included
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {steps.map((s) => (
          <li
            key={s.id}
            data-demo-next-step={s.id}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider">
                Review in {s.reviewByMonths} mo
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {TIMEFRAME_LABEL[s.timeframe]} · Owner: {OWNER_LABEL[s.owner]}
            </p>
            <p className="mt-2 text-sm text-foreground/85">{s.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AlternativePathways({ items }: { items: AlternativePathway[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Alternative pathways" className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Alternative Pathways</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((a) => (
          <li
            key={a.id}
            data-demo-alt-pathway={a.id}
            className="rounded-lg border border-border bg-muted/40 p-4"
          >
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            <p className="mt-1 text-sm text-foreground/80">
              <span className="font-semibold text-foreground/70">When to consider:</span>{" "}
              {a.whenToConsider}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConflictsList({
  items,
  shortName,
}: {
  items: PathwayConflict[];
  shortName: string;
}) {
  if (items.length === 0) {
    return (
      <aside
        className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
        aria-label="Conflicts and disagreements"
        data-demo-report-conflicts="none"
      >
        No conflicts flagged in {shortName}'s current evidence. If the family, student,
        or team disagrees with a recommendation, log it at the next PPT so the record stays
        honest.
      </aside>
    );
  }
  return (
    <section aria-label="Conflicts and disagreements" className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Conflicts To Resolve</h2>
      <ul className="space-y-2">
        {items.map((c) => (
          <li
            key={c.id}
            data-demo-conflict={c.id}
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground/85"
          >
            <p>{c.summary}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Resolution owner · {OWNER_LABEL[c.resolutionOwner]}
            </p>
          </li>
        ))}
      </ul>
    </section>
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
