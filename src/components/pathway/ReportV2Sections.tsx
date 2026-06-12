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
      <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 shadow-soft sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {audienceLabel[audience]}
        </p>
        <h2 className="mt-1 font-display text-xl sm:text-2xl">
          {studentName}'s full Pathway Report
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every recommendation below explains why it was made, what informed it, what
          should happen next, who should follow up, and whether it should be raised
          at the next PPT / IEP meeting.
        </p>
      </div>

      {iep && (
        <SectionBlock
          id="v2-iep-summary"
          icon={<FileText className="h-5 w-5" />}
          title="IEP / Transition Plan Summary"
          subtitle={
            iep.caveats ??
            "Pulled from the most recent IEP on file. Please verify against the source document before any formal action."
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {iep.plan_date_start || iep.plan_date_end ? (
              <Badge variant="outline" className="w-fit text-[11px]">
                Plan dates: {iep.plan_date_start ?? "—"} → {iep.plan_date_end ?? "—"}
              </Badge>
            ) : null}
          </div>
          {iep.present_levels && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Present levels
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{iep.present_levels}</p>
            </div>
          )}
          {iep.transition_goals?.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Transition goals
              </p>
              {iep.transition_goals.map((g, i) => (
                <div key={i} className="rounded-xl border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-wider text-primary">
                    {g.area}
                  </p>
                  <p className="mt-1 text-sm font-medium">{g.goal_text}</p>
                  {audience !== "educator" && (
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
                </div>
              ))}
            </div>
          )}
          {(iep.accommodations?.length || iep.services?.length) ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ChipList label="Accommodations" items={iep.accommodations} />
              <ChipList label="Services" items={iep.services} />
            </div>
          ) : null}
        </SectionBlock>
      )}

      <PillarRecsBlock
        id="v2-edu"
        icon={<BookOpen className="h-5 w-5" />}
        title="Postsecondary Education & Training Recommendations"
        audience={audience}
        message={msgs.postsecondary_education}
        recs={eduRecs}
      />
      <PillarRecsBlock
        id="v2-emp"
        icon={<Briefcase className="h-5 w-5" />}
        title="Employment Pathway Recommendations"
        audience={audience}
        message={msgs.employment_pathway}
        recs={empRecs}
      />
      <PillarRecsBlock
        id="v2-il"
        icon={<Home className="h-5 w-5" />}
        title="Independent Living Recommendations"
        audience={audience}
        message={msgs.independent_living}
        recs={ilRecs}
      />
      <PillarRecsBlock
        id="v2-comm"
        icon={<Users className="h-5 w-5" />}
        title="Community Participation Recommendations"
        audience={audience}
        message={msgs.community_participation}
        recs={commRecs}
      />

      {resourceMatches.length > 0 && (
        <SectionBlock
          id="v2-resources"
          icon={<BookOpen className="h-5 w-5" />}
          title="Resource Matches"
          subtitle="Resources matched to this student's interests, goals, and supports."
        >
          <ul className="space-y-3">
            {resourceMatches.map((m, i) => (
              <li key={i} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{m.title}</p>
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
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Why:</span> {m.why}
                </p>
                <p className="mt-1 text-xs">
                  <span className="font-semibold">Next:</span> {m.next_action}
                </p>
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
        </SectionBlock>
      )}

      {partnerMatches.length > 0 && (
        <SectionBlock
          id="v2-partners"
          icon={<Handshake className="h-5 w-5" />}
          title="Partner / Opportunity Matches"
          subtitle="Programs, internships, and adult-service partners matched to this student."
        >
          <ul className="space-y-3">
            {partnerMatches.map((m, i) => (
              <li key={i} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.organization && (
                      <p className="text-xs text-muted-foreground">{m.organization}</p>
                    )}
                  </div>
                  {m.readiness_level && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {m.readiness_level}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Why:</span> {m.why}
                </p>
                <p className="mt-1 text-xs">
                  <span className="font-semibold">Next:</span> {m.next_action}
                </p>
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
        </SectionBlock>
      )}

      {gaps.length > 0 && (
        <SectionBlock
          id="v2-gaps"
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          title="Missing Information & Planning Gaps"
          subtitle="Filling these in will make the next regeneration of this report sharper."
          tone="warn"
        >
          <ul className="space-y-3">
            {gaps.map((g, i) => (
              <li
                key={i}
                className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-4 dark:bg-amber-900/10"
              >
                <p className="text-sm font-semibold">{g.topic}</p>
                <p className="mt-1 text-xs text-muted-foreground">{g.why_it_matters}</p>
                <p className="mt-2 text-xs">
                  <span className="font-semibold">How to collect:</span> {g.how_to_collect}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Follow-up: {g.owner_role.replace("_", " ")}
                </p>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      {(audience === "student" || audience === "family") && studentPlan && (
        <ActionPlanBlock
          id="v2-student-plan"
          icon={<Compass className="h-5 w-5" />}
          title="Student Action Plan"
          plan={studentPlan}
          pronoun="you"
        />
      )}
      {familyPlan && (
        <ActionPlanBlock
          id="v2-family-plan"
          icon={<Users className="h-5 w-5" />}
          title="Family Action Plan"
          plan={familyPlan}
          pronoun="your family"
        />
      )}
      {audience === "educator" && eduPlan && (
        <ActionPlanBlock
          id="v2-edu-plan"
          icon={<FileText className="h-5 w-5" />}
          title="Educator / Case Manager Action Plan"
          plan={eduPlan}
          pronoun="the team"
        />
      )}

      {meetingQs?.length ? (
        <SectionBlock
          id="v2-meeting-qs"
          icon={<MessageSquareQuote className="h-5 w-5" />}
          title="Meeting Prep Questions"
          subtitle="Bring these to the next PPT / IEP / transition meeting."
        >
          <ul className="space-y-2">
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
                  className="flex items-start gap-2 rounded-xl border bg-card p-3"
                >
                  <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">
                    {q.for_audience}
                  </Badge>
                  <div>
                    <p className="text-sm">{q.question}</p>
                    {q.why && audience !== "student" && (
                      <p className="mt-1 text-xs text-muted-foreground">{q.why}</p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </SectionBlock>
      ) : null}

      {cross && (
        <SectionBlock
          id="v2-horizons"
          icon={<Calendar className="h-5 w-5" />}
          title="30 / 90 day · 6-month · 1-year plan"
          subtitle="A cross-cutting view of what should happen, when."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HorizonCard label="Next 30 days" items={cross.thirty_day} />
            <HorizonCard label="Next 90 days" items={cross.ninety_day} />
            <HorizonCard label="Next 6 months" items={cross.six_month} />
            <HorizonCard label="Next year" items={cross.one_year} />
          </div>
        </SectionBlock>
      )}
    </section>
  );
}

/* ------------------------------ helpers ------------------------------ */

function SectionBlock({
  id,
  icon,
  title,
  subtitle,
  children,
  tone = "default",
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <section
      id={id}
      className={
        tone === "warn"
          ? "rounded-3xl border border-amber-300/60 bg-card p-5 shadow-soft sm:p-6"
          : "rounded-3xl border bg-card p-5 shadow-soft sm:p-6"
      }
    >
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h3 className="font-display text-lg sm:text-xl">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PillarRecsBlock({
  id,
  icon,
  title,
  audience,
  message,
  recs,
}: {
  id: string;
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
    <SectionBlock id={id} icon={icon} title={title} subtitle={message}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ordered.map((rec, i) => (
          <RecommendationCard key={i} rec={rec} audience={audience} />
        ))}
      </div>
    </SectionBlock>
  );
}

function ChipList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
  icon,
  title,
  plan,
  pronoun,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  plan: ActionPlan;
  pronoun: string;
}) {
  return (
    <SectionBlock
      id={id}
      icon={icon}
      title={title}
      subtitle={plan.intro ?? `What ${pronoun} can do, broken out by timeframe.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HorizonCard label="Next 30 days" items={plan.horizons.thirty_day} />
        <HorizonCard label="Next 90 days" items={plan.horizons.ninety_day} />
        <HorizonCard label="Next 6 months" items={plan.horizons.six_month} />
        <HorizonCard label="Next year" items={plan.horizons.one_year} />
      </div>
    </SectionBlock>
  );
}

function HorizonCard({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm leading-snug">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
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
          <p className="text-sm font-semibold">Refresh this report with the latest format</p>
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
