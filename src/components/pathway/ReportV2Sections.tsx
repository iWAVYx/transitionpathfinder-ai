/**
 * v2 Pathway Report sections — rendered alongside the legacy `ReportView`
 * when the report content opted into `schema_version: 2`.
 *
 * Sections rendered here cover the additive parts of the 21-section spine:
 * IEP / Transition Plan Summary, four pillar recommendation blocks,
 * Resource Matches, Partner / Opportunity Matches, Planning Gaps,
 * Student / Family / Educator Action Plans (30/90/6mo/1yr), Meeting Prep
 * Questions, and cross-cutting time horizons.
 *
 * Audience is read from the URL search param `?audience=student|family|educator`
 * (set on the route) so share links are shareable per audience.
 */
import { useMemo } from "react";
import {
  Compass,
  Briefcase,
  Home,
  Users,
  BookOpen,
  Handshake,
  AlertTriangle,
  Calendar,
  MessageSquareQuote,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/pathway/RecommendationCard";
import { SourceChips } from "@/components/pathway/SourceChips";
import type {
  ActionPlan,
  Horizons,
  IepPlanSummary,
  MissingInfo,
  PartnerMatch,
  PillarRec,
  ResourceMatch,
} from "@/lib/pathway-v2";
import { isV2 } from "@/lib/pathway-v2";
import {
  ReportV2SnapshotHeader,
  ReportV2ExtrasBody,
} from "@/components/pathway/ReportV2Extras";
import {
  PublicationPage,
  PublicationChecklist,
  PublicationCallout,
  PublicationPullQuote,
  PublicationSource,
  PublicationSpread,
  PublicationSidebar,
} from "@/components/publication/PublicationPage";

export type V2Audience = "student" | "family" | "educator";

export function ReportV2Sections({
  content,
  audience,
  studentName,
}: {
  content: unknown;
  audience: V2Audience;
  studentName: string;
}) {
  if (!isV2(content)) return null;
  const r = content as Record<string, unknown>;

  const iep = r.iep_plan_summary as IepPlanSummary | undefined;
  const eduRecs = (r.postsecondary_education_recs as PillarRec[] | undefined) ?? [];
  const empRecs = (r.employment_pathway_recs as PillarRec[] | undefined) ?? [];
  const ilRecs = (r.independent_living_recs as PillarRec[] | undefined) ?? [];
  const commRecs = (r.community_participation_recs as PillarRec[] | undefined) ?? [];
  const resourceMatches = (r.resource_matches as ResourceMatch[] | undefined) ?? [];
  const partnerMatches = (r.partner_matches as PartnerMatch[] | undefined) ?? [];
  const gaps = (r.missing_information_v2 as MissingInfo[] | undefined) ?? [];
  const studentPlan = r.student_action_plan as ActionPlan | undefined;
  const familyPlan = r.family_action_plan_v2 as ActionPlan | undefined;
  const eduPlan = r.educator_action_plan_v2 as ActionPlan | undefined;
  const cross = r.cross_cutting_horizons as Horizons | undefined;
  const meetingQs = r.meeting_prep_questions as
    | Array<{ question: string; for_audience: string; why?: string }>
    | undefined;
  const audMsgs = r.audience_messages as
    | { student?: Record<string, string>; family?: Record<string, string>; educator?: Record<string, string> }
    | undefined;

  const msgs = audMsgs?.[audience] ?? {};

  // Reorder/scope for each audience.
  const audienceLabel: Record<V2Audience, string> = {
    student: "What this means for you",
    family: "What this means for your family",
    educator: "What this means for the team",
  };

  return (
    <section
      aria-label="Pathway Report — detailed sections"
      className="mx-auto max-w-5xl space-y-8 px-4 pb-12 sm:px-6 lg:px-8"
    >
      <ReportV2SnapshotHeader
        content={content}
        audience={audience}
        studentName={studentName}
      />

      <PublicationPullQuote attribution={audienceLabel[audience]}>
        <p className="font-display text-xl sm:text-2xl">{studentName}'s Full Pathway Report</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Every recommendation below explains why it was made, what informed it, what
          should happen next, who should follow up, and whether it should be raised
          at the next PPT / IEP meeting.
        </p>
      </PublicationPullQuote>

      <ReportV2ExtrasBody content={content} audience={audience} />

      {iep && (
        <PublicationPage
          kicker="Section 01"
          chapter="IEP / Transition Plan Summary"
          dek={
            iep.caveats ??
            "Pulled from the most recent IEP on file. Please verify against the source document before any formal action."
          }
        >
          <section id="v2-iep-summary">
            <div className="flex flex-wrap gap-2">
              {(iep.plan_date_start || iep.plan_date_end) && (
                <Badge variant="outline" className="w-fit text-[11px]">
                  Plan dates: {iep.plan_date_start ?? "—"} → {iep.plan_date_end ?? "—"}
                </Badge>
              )}
            </div>

            {iep.present_levels && (
              <div className="mt-4">
                <h2 className="font-display text-lg">Present Levels</h2>
                <hr className="my-2 border-t border-[color:var(--pub-rule-soft)]" />
                <p className="text-sm whitespace-pre-wrap">{iep.present_levels}</p>
              </div>
            )}

            {iep.transition_goals?.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-lg">Transition Goals</h2>
                <hr className="my-2 border-t border-[color:var(--pub-rule-soft)]" />
                <ul>
                  {iep.transition_goals.map((g, i) => (
                    <li
                      key={i}
                      className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary font-[Urbanist,sans-serif]">
                        {g.area}
                      </p>
                      <p className="mt-1 font-[Instrument_Serif,serif] text-base font-medium">
                        {g.goal_text}
                      </p>
                      {audience !== "educator" && g.plain_language && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          In plain language: {g.plain_language}
                        </p>
                      )}
                      {g.related_services?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {g.related_services.map((s) => (
                            <li key={s}>
                              <Badge variant="secondary" className="text-[10px]">
                                {s}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(iep.accommodations?.length || iep.services?.length) ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ChipList label="Accommodations" items={iep.accommodations} />
                <ChipList label="Services" items={iep.services} />
              </div>
            ) : null}
          </section>
        </PublicationPage>
      )}

      <PillarRecsBlock
        id="v2-edu"
        sectionNum="02"
        icon={<BookOpen className="h-5 w-5" />}
        title="Postsecondary Education & Training Recommendations"
        audience={audience}
        message={msgs.postsecondary_education}
        recs={eduRecs}
      />
      <PillarRecsBlock
        id="v2-emp"
        sectionNum="03"
        icon={<Briefcase className="h-5 w-5" />}
        title="Employment Pathway Recommendations"
        audience={audience}
        message={msgs.employment_pathway}
        recs={empRecs}
      />
      <PillarRecsBlock
        id="v2-il"
        sectionNum="04"
        icon={<Home className="h-5 w-5" />}
        title="Independent Living Recommendations"
        audience={audience}
        message={msgs.independent_living}
        recs={ilRecs}
      />
      <PillarRecsBlock
        id="v2-comm"
        sectionNum="05"
        icon={<Users className="h-5 w-5" />}
        title="Community Participation Recommendations"
        audience={audience}
        message={msgs.community_participation}
        recs={commRecs}
      />

      {resourceMatches.length > 0 && (
        <PublicationPage
          kicker="Section 06"
          chapter="Resource Matches"
          dek="Resources matched to this student's interests, goals, and supports."
        >
          <section id="v2-resources">
            <ul>
              {resourceMatches.map((m, i) => (
                <li
                  key={i}
                  className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-[Instrument_Serif,serif] text-base font-medium">
                      {m.title}
                    </p>
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {m.summary && (
                    <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <PublicationCallout kind="means">
                      {m.why}
                    </PublicationCallout>
                    <PublicationCallout kind="next">
                      {m.next_action}
                    </PublicationCallout>
                  </div>
                  {audience !== "student" && (
                    <SourceChips
                      sources={m.sources}
                      collapsed={audience === "family"}
                      className="mt-2"
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </PublicationPage>
      )}

      {partnerMatches.length > 0 && (
        <PublicationPage
          kicker="Section 07"
          chapter="Partner / Opportunity Matches"
          dek="Programs, internships, and adult-service partners matched to this student."
        >
          <section id="v2-partners">
            <ul>
              {partnerMatches.map((m, i) => (
                <li
                  key={i}
                  className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-[Instrument_Serif,serif] text-base font-medium">
                        {m.title}
                      </p>
                      {m.organization && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-[Urbanist,sans-serif]">
                          {m.organization}
                        </p>
                      )}
                    </div>
                    {m.readiness_level && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {m.readiness_level}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    <PublicationCallout kind="means">
                      {m.why}
                    </PublicationCallout>
                    <PublicationCallout kind="next">
                      {m.next_action}
                    </PublicationCallout>
                  </div>
                  {audience !== "student" && (
                    <SourceChips
                      sources={m.sources}
                      collapsed={audience === "family"}
                      className="mt-2"
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </PublicationPage>
      )}

      {gaps.length > 0 && (
        <PublicationPage
          kicker="Section 08"
          chapter="Missing Information & Planning Gaps"
          dek="Filling these in will make the next regeneration of this report sharper."
        >
          <section id="v2-gaps">
            <ul>
              {gaps.map((g, i) => (
                <li
                  key={i}
                  className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
                >
                  <p className="font-[Instrument_Serif,serif] text-base font-medium">
                    {g.topic}
                  </p>
                  <PublicationCallout kind="matters">
                    {g.why_it_matters}
                  </PublicationCallout>
                  <PublicationCallout kind="next">
                    {g.how_to_collect}
                  </PublicationCallout>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-[Urbanist,sans-serif]">
                    Follow-up: {g.owner_role.replace("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </PublicationPage>
      )}

      {(audience === "student" || audience === "family") && studentPlan && (
        <ActionPlanBlock
          id="v2-student-plan"
          sectionNum="09"
          title="Student Action Plan"
          plan={studentPlan}
          pronoun="you"
        />
      )}
      {familyPlan && (
        <ActionPlanBlock
          id="v2-family-plan"
          sectionNum="10"
          title="Family Action Plan"
          plan={familyPlan}
          pronoun="your family"
        />
      )}
      {audience === "educator" && eduPlan && (
        <ActionPlanBlock
          id="v2-edu-plan"
          sectionNum="11"
          title="Educator / Case Manager Action Plan"
          plan={eduPlan}
          pronoun="the team"
        />
      )}

      {meetingQs?.length ? (
        <PublicationPage
          kicker="Section 12"
          chapter="Meeting Prep Questions"
          dek="Bring these to the next PPT / IEP / transition meeting."
        >
          <section id="v2-meeting-qs">
            <ul>
              {meetingQs
                .filter((q) =>
                  audience === "student"
                    ? q.for_audience === "student" || q.for_audience === "team"
                    : audience === "family"
                    ? q.for_audience !== "educator"
                    : true,
                )
                .map((q, i) => (
                  <li
                    key={i}
                    className="border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary font-[Urbanist,sans-serif]">
                      {q.for_audience}
                    </p>
                    <p className="mt-1 font-[Instrument_Serif,serif] text-base">
                      {q.question}
                    </p>
                    {q.why && audience !== "student" && (
                      <PublicationCallout kind="means">
                        {q.why}
                      </PublicationCallout>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        </PublicationPage>
      ) : null}

      {cross && (
        <PublicationPage
          kicker="Section 13"
          chapter="30 / 90 Day · 6-Month · 1-Year Plan"
          dek="A cross-cutting view of what should happen, when."
        >
          <section id="v2-horizons">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <HorizonChecklist label="Next 30 Days" items={cross.thirty_day} />
              <HorizonChecklist label="Next 90 Days" items={cross.ninety_day} />
              <HorizonChecklist label="Next 6 Months" items={cross.six_month} />
              <HorizonChecklist label="Next Year" items={cross.one_year} />
            </div>
          </section>
        </PublicationPage>
      )}
    </section>
  );
}

/* ------------------------------ helpers ------------------------------ */

function PillarRecsBlock({
  id,
  sectionNum,
  title,
  audience,
  message,
  recs,
}: {
  id: string;
  sectionNum: string;
  icon: React.ReactNode;
  title: string;
  audience: V2Audience;
  message?: string;
  recs: PillarRec[];
}) {
  const ordered = useMemo(() => {
    return [...recs].sort((a, b) => {
      const aFlag = a.discuss_at_next_meeting ? 0 : 1;
      const bFlag = b.discuss_at_next_meeting ? 0 : 1;
      return aFlag - bFlag;
    });
  }, [recs]);
  if (!recs.length) return null;
  return (
    <PublicationPage
      kicker={`Section ${sectionNum}`}
      chapter={title}
      dek={message}
    >
      <section id={id}>
        <div className="grid gap-3 sm:grid-cols-2">
          {ordered.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} audience={audience} />
          ))}
        </div>
      </section>
    </PublicationPage>
  );
}

function ChipList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-[Urbanist,sans-serif]">
        {label}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li key={t}>
            <Badge variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionPlanBlock({
  id,
  sectionNum,
  title,
  plan,
  pronoun,
}: {
  id: string;
  sectionNum: string;
  title: string;
  plan: ActionPlan;
  pronoun: string;
}) {
  return (
    <PublicationPage
      kicker={`Section ${sectionNum}`}
      chapter={title}
      dek={plan.intro ?? `What ${pronoun} can do, broken out by timeframe.`}
    >
      <section id={id}>
        <PublicationSpread
          lead={
            <div className="space-y-6">
              <HorizonChecklist label="Next 30 Days" items={plan.horizons.thirty_day} />
              <HorizonChecklist label="Next 90 Days" items={plan.horizons.ninety_day} />
            </div>
          }
          side={
            <PublicationSidebar label="Longer Range">
              <div className="space-y-6">
                <HorizonChecklist label="Next 6 Months" items={plan.horizons.six_month} />
                <HorizonChecklist label="Next Year" items={plan.horizons.one_year} />
              </div>
            </PublicationSidebar>
          }
        />
      </section>
    </PublicationPage>
  );
}

function HorizonChecklist({ label, items }: { label: string; items: string[] }) {
  return <PublicationChecklist title={label} items={items} />;
}

export function RegenerateBanner({
  onRegenerate,
  busy,
  canRegenerate,
}: {
  onRegenerate: () => void;
  busy: boolean;
  canRegenerate: boolean;
}) {
  return (
    <div className="mx-auto mt-2 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <div>
          <p className="text-sm font-semibold">Refresh This Report With the Latest Format</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pulls the newest profile data, IEP uploads, Student Voice, goals, readiness,
            saved resources, and partner matches. Your current report is kept as a version.
          </p>
        </div>
        <Button
          size="sm"
          onClick={onRegenerate}
          disabled={busy || !canRegenerate}
          title={canRegenerate ? "" : "Link this report to a student first"}
        >
          {busy ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
    </div>
  );
}
