import { ReportSourceEntry } from "@/components/documents/ReportSourceEntry";
import { ReportPlanningGap } from "@/components/documents/ReportPlanningGap";
import { ReportGoalHeading } from "@/components/documents/ReportGoalHeading";
import { ReportOverview } from "@/components/documents/ReportOverview";
import { demoReportNextStepPreview } from "@/lib/demo/report-overview";
import { ReportGoalDetails } from "@/components/documents/ReportGoalDetails";
import { ReportReadinessRow, ReadinessBadge, READINESS_LABELS } from "@/components/documents/ReportReadinessRow";
import { ReportProfileDetails } from "@/components/documents/ReportProfileDetails";
import { DocumentSectionTitle } from "@/components/documents/DocumentSectionTitle";
import { REPORT_SECTION_LABELS } from "@/lib/workspace/stages";
import { StudentVoiceQuotes } from "@/components/documents/StudentVoiceQuotes";
import { PublicationPage } from "@/components/publication/PublicationPage";
import { ReportContents } from "@/components/documents/ReportContents";
import { ReportPdfButton } from "@/components/documents/ReportPdfButton";
import { DocumentPrintStyles } from "@/components/documents/DocumentPrintStyles";
import { PathwayDocumentPresentation } from "@/components/documents/PathwayDocumentPresentation";
import { PathwayReportBody } from "@/components/pathway/report/PathwayReportBody";
import { toTitleCase } from "@/lib/title-case";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  generatePathwayReport,
  type AlternativePathway,
  type EnrichedNextStep,
  type GeneratedReport,
  type PathwayConflict,
  type PathwayOption,
  type ReportBlock,
} from "@/lib/demo/pathway-engine";
import type { DemoPathwayGoal, DemoProfile } from "@/lib/demo/demo-profiles";
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

const GOAL_STATUS_LABEL: Record<DemoPathwayGoal["status"], string> = {
  not_started: "Not Started", in_progress: "In Progress", on_track: "On Track", needs_review: "Needs Review",
};
const GOAL_HORIZON_LABEL: Record<DemoPathwayGoal["horizon"], string> = {
  next_semester: "Next Semester", this_year: "This Year", next_year: "Next Year", "2_to_3_years": "2–3 Years",
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
        body: `Review ${name}'s goals, supports and options together. Start with the family and shared next steps, then discuss them with the student and school team.`,
      };
    case "educator":
      return {
        eyebrow: "For Educator",
        heading: `What this means for ${name}'s team`,
        body: `Review ${name}'s recorded strengths, supports and evidence gaps. Start with the school team's next steps and agree on follow-up with the student and family.`,
      };
    case "student":
    default:
      return {
        eyebrow: "For You",
        heading: `Your Pathway, ${name}`,
        body: `Start with your goals and what helps you learn. Your next steps come first, followed by the things you can plan together with your family and school team.`,
      };
  }
}

/**
 * Age-aware Pathway Report renderer.
 *
 * Reads a fictional DemoProfile, runs it through the pure pathway engine,
 * and uses the live report document/stage presentation for the seven
 * required explanation sections + the filtered
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
  const learningGroups = [
    { label: "Strengths", items: profile.learning.strengths },
    { label: "Learning Preferences", items: profile.learning.learningPreferences },
    { label: "Interests", items: profile.learning.interests },
    { label: "Support Needs", items: profile.learning.supportNeeds },
    { label: "Sensory Preferences", items: profile.learning.sensoryNotes ?? [] },
    { label: "Communication Style", items: profile.learning.communicationStyle ? [profile.learning.communicationStyle] : [] },
    { label: "Helpful Settings", items: [profile.environment.idealSchoolFeel, profile.environment.classSizePreference, ...profile.environment.environmentsToSeek].filter(Boolean) },
    { label: "Settings to Avoid", items: profile.environment.environmentsToAvoid },
  ];
  const hasLearningDetails = learningGroups.some(group => group.items.length > 0);
  const travelLabels = { family_car: "Family Car", school_bus: "School Bus", public_transit: "Public Transit", walk_or_bike: "Walking or Biking", rideshare: "Rideshare" };
  const familyGroups = [
    { label: "Family Priorities", items: profile.family.keyConsiderations },
    { label: "Travel and Scheduling", items: [
      ...(profile.family.transportation.length > 0 ? [`Travel options: ${profile.family.transportation.map(mode => travelLabels[mode]).join(", ")}.`] : []),
      profile.family.transportationNote, profile.family.workingParentSchedule,
    ].filter((item): item is string => !!item) },
  ];
  const hasFamilyContext = familyGroups.some(group => group.items.length > 0);
  const detailedActionSummaries = new Set(report.nextSteps.map(step =>
    `[${TIMEFRAME_LABEL[step.timeframe]} · ${OWNER_LABEL[step.owner]}] ${step.title} — ${step.detail}`));
  const detailedProfileSummaries = new Set([
    `Strengths — ${profile.learning.strengths.slice(0, 4).join(", ")}.`,
    `Interests — ${profile.learning.interests.slice(0, 4).join(", ")}.`,
    `Supports that work — ${profile.learning.supportNeeds.slice(0, 4).join(", ")}.`,
    `Ideal school feel — ${profile.environment.idealSchoolFeel}.`,
  ]);
  const detailedFitSummaries = new Set([
    `Readiness overall: ${READINESS_LABELS[profile.readiness.overall]}. By area — education: ${READINESS_LABELS[profile.readiness.byArea.education]}, employment: ${READINESS_LABELS[profile.readiness.byArea.employment]}, living: ${READINESS_LABELS[profile.readiness.byArea.living]}, advocacy: ${READINESS_LABELS[profile.readiness.byArea.advocacy]}.`,
    `Environment fit — seek ${profile.environment.environmentsToSeek.join("; ")}. Avoid ${profile.environment.environmentsToAvoid.join("; ")}.`,
  ]);
  const detailedEvidenceSummaries = new Set(profile.evidence.map(item => `${item.title} — ${item.source}, ${item.date}. ${item.summary}`));
  const blocks = (...sections: ReportBlock["section"][]) => (
    <ReportBlocks evidence={profile.evidence} blocks={report.blocks.filter((block) => sections.includes(block.section)).map(block =>
      ({ ...block, bullets: block.bullets?.filter(bullet => {
        const repeats = block.section === "what_to_do_next" ? detailedActionSummaries
          : block.section === "what_we_know" ? detailedProfileSummaries
          : block.section === "why_it_fits" ? detailedFitSummaries
          : block.section === "evidence" ? detailedEvidenceSummaries : undefined;
        return !repeats?.has(bullet);
      }) }))} />
  );
  return (
    <div className="report-shell">
      <section
        aria-label={`Pathway report for ${profile.shortName} (${audience} view)`}
        data-demo-report-profile={profile.id}
        data-demo-report-audience={audience}
        data-generated-document
        data-print-document
        data-age-aware-report
        className="report-root mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8"
      >
        <style>{`
          @media print {
            [data-age-aware-report] [data-demo-report-header] > div {
              display: grid !important; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
              align-items: start; gap: 0.15in;
            }
            [data-age-aware-report] [data-demo-report-header] * { text-align: left !important; }
            [data-age-aware-report] [data-demo-report-header] .items-end { align-items: start !important; }
            [data-age-aware-report] .report-stage { background: none !important; padding: 0 !important; break-before: auto !important; page-break-before: auto !important; }
            [data-age-aware-report] .report-stage::before,
            [data-age-aware-report] .report-stage::after,
            [data-age-aware-report] .report-stage > header::before { display: none !important; }
            [data-age-aware-report] [data-demo-report-section],
            [data-age-aware-report] [data-demo-pathway-option],
            [data-age-aware-report] [data-demo-alt-pathway],
            [data-age-aware-report] [data-demo-review-summary],
            [data-age-aware-report] [data-demo-next-step] { break-inside: avoid !important; }
            [data-age-aware-report] [data-demo-report-section] > div,
            [data-age-aware-report] [data-demo-pathway-option] > div { padding: 0.1in !important; }
            [data-age-aware-report] .report-stage > header { break-after: avoid; }
            body:has(.report-root) .report-root [data-report-opportunity-matches][data-report-opportunity-matches] {
              break-inside: avoid !important; page-break-inside: avoid !important;
            }
            [data-age-aware-report] [data-document-columns] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            [data-age-aware-report] [data-single-report-block] { grid-template-columns: minmax(0, 1fr) !important; }
          }
        `}</style>
        <DocumentPrintStyles />
        <PathwayDocumentPresentation sample />
        <ReportHeader report={report} profile={profile} />
        <AudienceFrame frame={frame} />
        <div className="no-print print:hidden flex justify-end"><ReportPdfButton size="sm" className="bg-demo-primary" /></div>
        <ReportContents items={[
          { id: "demo-report-overview", label: "At a Glance" },
          { id: "section-student_snapshot", label: "Student Snapshot" },
          ...(profile.voice.length > 0 ? [{ id: "section-student_voice", label: `In ${profile.shortName}'s Voice` }] : []),
          ...(hasLearningDetails ? [{ id: "section-strengths_preferences_interests_needs", label: "Strengths and Supports" }] : []),
          ...(hasFamilyContext ? [{ id: "section-family_action_plan", label: "Family Context" }] : []),
          { id: "section-educator_action_plan", label: "How Your Team Can Help" },
          { id: "section-data_gaps", label: "Evidence and What We Still Need" },
          { id: "section-readiness_scorecard", label: "Readiness Snapshot" },
          ...(profile.goals.length > 0 ? [{ id: "section-postsecondary_goals", label: "Goals to Discuss" }] : []),
          { id: "section-recommended_pathways", label: "Recommended Pathways and Alternatives" },
          { id: "section-next_steps_30_90_180_365", label: "Next Steps" },
          { id: "section-partner_matches", label: "Opportunities to Explore" },
          { id: "report-appendix", label: "Review Notes and When to Revisit" },
        ]} />
        <section id="demo-report-overview" className="mt-10 page-break exec-summary">
          <ReportOverview summary={report.focus} strengths={profile.learning.strengths.slice(0, 3)}
            direction={report.pathwayOptions[0] ? { label: "Direction to Explore", title: report.pathwayOptions[0].title, explanation: report.pathwayOptions[0].fitSummary } : undefined}
            nextSteps={demoReportNextStepPreview(report.nextSteps, audience)} />
        </section>
        <PathwayReportBody
          sectionLabels={{ family_action_plan: "Family Context", educator_action_plan: "How Your Team Can Help" }}
          stageCopy={{ family: {
            title: "Family Context", description: "Consider family priorities, travel options and scheduling when planning next steps together.",
          }, roadmap: {
            title: "Pathway and Goals",
            description: profile.demographics.gradeNumber < 11
              ? "Explore school choices, interests and skills with your team, then agree on goals that fit your next stage."
              : "Connect school, work and daily-living goals with realistic pathways and supports.",
          }, action: {
            title: "Next Steps",
            description: "Use each recommendation's original timeframe and review date to plan with your team.",
          } }}
          sections={{
            student_snapshot: blocks("what_we_know"),
            student_voice: profile.voice.length > 0 ? <DocumentSectionTitle title={REPORT_SECTION_LABELS.student_voice}><PublicationPage
              kicker="In Their Own Words"
              chapter={REPORT_SECTION_LABELS.student_voice}
              dek={`These are ${profile.shortName}'s saved answers in this fictional example. Use them when discussing the options in this report.`}
            >
              <StudentVoiceQuotes responses={profile.voice.map((response, index) => ({
                id: `${profile.id}-voice-${index}`, prompt: response.prompt, answer: response.answer,
              }))} />
            </PublicationPage></DocumentSectionTitle> : null,
            strengths_preferences_interests_needs: hasLearningDetails ? <DocumentSectionTitle title={REPORT_SECTION_LABELS.strengths_preferences_interests_needs}>
              <PublicationPage kicker="Strengths and Supports" chapter={REPORT_SECTION_LABELS.strengths_preferences_interests_needs}
                dek={`These details come from ${profile.shortName}'s fictional sample profile. Use them to discuss what helps with learning and participation.`}>
                <ReportProfileDetails groups={learningGroups} />
              </PublicationPage>
            </DocumentSectionTitle> : null,
            family_action_plan: hasFamilyContext ? <DocumentSectionTitle title="Family Context">
              <PublicationPage kicker="Family Context" chapter="Family Context"
                dek={`These details are recorded in ${profile.shortName}'s fictional sample profile. Discuss what is practical for the family before agreeing on next steps.`}>
                <ReportProfileDetails groups={familyGroups} />
              </PublicationPage>
            </DocumentSectionTitle> : null,
            educator_action_plan: blocks("ahead_beside_behind"),
            data_gaps: blocks("evidence", "unknowns"),
            readiness_scorecard: <DocumentSectionTitle title="Readiness Snapshot">
              <PublicationPage kicker="Readiness Snapshot" chapter="Readiness Snapshot"
                dek="These recorded sample bands are conversation starters, not grades or assessment scores.">
                <div data-demo-readiness-overall className="flex flex-wrap items-start justify-between gap-3">
                  <h3>Overall Readiness</h3><ReadinessBadge level={profile.readiness.overall} compact />
                </div>
                <div data-report-readiness-grid>
                  {([
                    ["education", "School and Learning"],
                    ["employment", profile.demographics.gradeNumber < 11 ? "Career Exploration" : "Work Preparation"],
                    ["living", "Daily Living"], ["advocacy", "Self-Advocacy"],
                  ] as const).map(([area, title]) => <ReportReadinessRow key={area} title={title} level={profile.readiness.byArea[area]} />)}
                </div>
                {profile.readiness.notes && <p className="mt-3 text-sm text-muted-foreground">{profile.readiness.notes}</p>}
                <p className="mt-3 text-sm text-muted-foreground">Review current observations with the student and team before agreeing on goals or supports. This sample does not include scored assessments or evidence for each band.</p>
              </PublicationPage>
            </DocumentSectionTitle>,
            postsecondary_goals: profile.goals.length > 0 ? <DocumentSectionTitle title="Goals to Discuss">
              <PublicationPage kicker="Goals to Discuss" chapter="Goals to Discuss"
                dek={`These goals are recorded in ${profile.shortName}'s fictional sample profile. Review them with the student and team; they are not an agreed IEP or a new assessment.`}>
                <div data-report-recorded-goals>
                  {profile.goals.map((goal, index) => <section key={`${goal.area}-${index}`} data-report-recorded-goal>
                    <ReportGoalHeading title={goal.area === "education" ? "School and Learning" : goal.area === "employment"
                      ? profile.demographics.gradeNumber < 11 ? "Career Exploration" : "Work Preparation"
                      : goal.area === "living" ? "Daily Living" : "Self-Advocacy"} />
                    <p data-report-recorded-goal-title>{goal.title}</p>
                    <ReportGoalDetails>
                      <dl><dt>Where Things Stand</dt><dd>{GOAL_STATUS_LABEL[goal.status]}</dd></dl>
                      <dl><dt>Planning Timeframe</dt><dd>{GOAL_HORIZON_LABEL[goal.horizon]}</dd></dl>
                    </ReportGoalDetails>
                  </section>)}
                </div>
              </PublicationPage>
            </DocumentSectionTitle> : null,
            recommended_pathways: <>
              {blocks("why_it_fits")}
              <PathwayOptions options={report.pathwayOptions} shortName={profile.shortName} />
              <AlternativePathways items={report.alternativePathways} />
            </>,
            next_steps_30_90_180_365: <>
              {blocks("what_to_do_next")}
              <NextStepsList steps={report.nextSteps} audience={audience} />
            </>,
            partner_matches: <OpportunityMatches reportView profile={profile} />,
          }}
          appendix={<div data-demo-review-summary className="space-y-4">
            {blocks("when_to_revisit")}
            <ConflictsList items={report.conflicts} shortName={profile.shortName} />
            <RevisitFooter report={report} profile={profile} />
          </div>}
        />
      </section>
    </div>
  );
}

function AudienceFrame({
  frame,
}: {
  frame: { eyebrow: string; heading: string; body: string };
}) {
  return (
    <div
      role="note"
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      aria-label="Audience framing"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
        {frame.eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{toTitleCase(frame.heading)}</h2>
      <p className="mt-1 text-sm text-foreground/80">{frame.body}</p>
    </div>
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
    <header data-demo-report-header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Pathway Report · Fictional Demo
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
            {toTitleCase(report.headline)}
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

function ReportBlocks({ blocks, evidence }: { blocks: ReportBlock[]; evidence: DemoProfile["evidence"] }) {
  return (
    <div className={`grid gap-4 ${blocks.length > 1 ? "md:grid-cols-2" : ""}`} data-document-columns data-single-report-block={blocks.length === 1 || undefined}>
      {blocks.map((b) => (
        <Card key={b.section} data-demo-report-section={b.section}>
          <CardHeader className="pb-2">
            <h3 className="text-base">{toTitleCase(b.heading)}</h3>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/85">
            {b.body && <p>{b.body}</p>}
            {b.section === "evidence" && evidence.map((item, index) => <ReportSourceEntry key={`${item.id}-${index}`}
              title={item.title} details={`${item.source} · ${item.date}`}>{item.summary}</ReportSourceEntry>)}
            {b.bullets && b.bullets.length > 0 && (
              <ul className="list-disc space-y-1.5 pl-5">
                {b.bullets.map((bl, i) => (
                  <li key={i}>{bl}</li>
                ))}
              </ul>
            )}
            {b.missing && (
              <ReportPlanningGap
                title="What We Still Need to Know"
                data-demo-report-missing={b.section}
                className="rounded-md border border-dashed border-amber-400/60 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <p className="mt-1">{b.missing.reason}</p>
                {b.missing.needed.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    {b.missing.needed.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </ReportPlanningGap>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NextStepsList({ steps, audience }: { steps: EnrichedNextStep[]; audience: DemoReportAudience }) {
  if (steps.length === 0) return null;
  const focus = audience === "educator" ? "school_team" : audience;
  const owners = Array.from(new Set<EnrichedNextStep["owner"]>([focus, "shared", "student", "family", "school_team"]));
  const groups = owners.map(owner => ({ owner, steps: steps.filter(step => step.owner === owner) })).filter(group => group.steps.length > 0);
  const groupLabel: Record<EnrichedNextStep["owner"], string> = {
    student: "For the Student", family: "For the Family", school_team: "For the School Team", shared: "To Plan Together",
  };
  return (
    <section aria-label="Recommended next steps" className="space-y-3">
      <div data-demo-action-summary className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Next Steps</h2>
        <p className="text-xs text-muted-foreground">{steps.length} recommendation{steps.length === 1 ? "" : "s"} · review timing included</p>
      </div>
      {!steps.some(step => step.owner === focus) && <p data-demo-no-role-action className="text-sm text-muted-foreground">
        No separate {OWNER_LABEL[focus].toLowerCase()} step is recorded in this sample. Start with the shared actions and agree on who can help.
      </p>}
      {groups.map(group => <section key={group.owner} data-demo-action-group={group.owner} className="space-y-3">
        <h3 className="text-primary">{groupLabel[group.owner]}</h3>
        <ul className={`grid gap-3 ${group.steps.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`} data-document-columns data-single-report-block={group.steps.length === 1 || undefined}>
          {group.steps.map(s => <li key={s.id} data-demo-next-step={s.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div data-demo-action-heading className="flex flex-wrap items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">{toTitleCase(s.title)}</h4>
              <Badge variant="outline" className="text-[10px]">Review in {s.reviewByMonths} mo</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{TIMEFRAME_LABEL[s.timeframe]} · Who Can Help: {OWNER_LABEL[s.owner]}</p>
            <p className="mt-2 text-sm text-foreground/85">{s.detail}</p>
          </li>)}
        </ul>
      </section>)}
    </section>
  );
}

function AlternativePathways({ items }: { items: AlternativePathway[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Alternative pathways" className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Alternative Pathways</h2>
      <ul className="grid gap-3 md:grid-cols-2" data-document-columns>
        {items.map((a) => (
          <li
            key={a.id}
            data-demo-alt-pathway={a.id}
            className="rounded-lg border border-border bg-muted/40 p-4"
          >
            <h3 className="text-sm font-semibold text-foreground">{toTitleCase(a.title)}</h3>
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
      <div
        role="note"
        className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
        aria-label="Conflicts and disagreements"
        data-demo-report-conflicts="none"
      >
        No conflicts flagged in {shortName}'s current evidence. If the family, student,
        or team disagrees with a recommendation, log it at the next PPT so the record stays
        honest.
      </div>
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
              Who Can Help Resolve This · {OWNER_LABEL[c.resolutionOwner]}
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
          <h3 className="text-base">Pathway Options</h3>
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
      <div className="grid gap-4 lg:grid-cols-2" data-document-columns>
        {options.map((opt) => (
          <Card key={opt.id} data-demo-pathway-option={opt.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="min-w-0 text-base leading-snug">{toTitleCase(opt.title)}</h3>
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
