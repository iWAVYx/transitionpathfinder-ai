import { reportWebDestination } from "./report-match-details";
import { ReportSchema, type PathwayReport } from "@/lib/pathway-generation-contract";
import { PathwayReportV2, StudentSnapshot, type SourceRef } from "@/lib/pathway-v2";
import { summarizeReportInputs } from "@/lib/report-source-summary";

export type SharedReportAudience = "family" | "educator";

/** Validate the stored document first, then explicitly project the fixed reader
 * audience. Never serialize raw manifests, internal IDs or undisplayed fields.
 * Keep this allowlist in step with ReportV2Sections/ReportV2Extras visibility.
 */
export function projectSharedReport(content: unknown, audience: SharedReportAudience): PathwayReport | null {
  if (audience !== "family" && audience !== "educator") return null;
  const legacy = ReportSchema.omit({ student_snapshot: true }).safeParse(content);
  if (!legacy.success || typeof content !== "object" || content === null) return null;
  const raw = content as Record<string, unknown>;
  if (raw.schema_version !== undefined && raw.schema_version !== 1 && raw.schema_version !== 2) return null;
  const snapshot = ReportSchema.shape.student_snapshot.safeParse(raw.student_snapshot);
  if (raw.schema_version !== 2) {
    return snapshot.success ? { ...legacy.data, student_snapshot: snapshot.data } : null;
  }
  const richer = PathwayReportV2.omit({ student_snapshot: true }).safeParse(raw);
  const identity = StudentSnapshot.safeParse(raw.student_snapshot);
  if (!richer.success || (!snapshot.success && !identity.success)) return null;
  const r = richer.data;
  const sourceInfo = (sources: SourceRef[]) => audience === "family"
    ? { sources: [], source_count: sources.length }
    : { sources: sources.map(({ kind, label }) => ({ kind, label })) };
  const recommendations = (items: typeof r.employment_pathway_recs) => items?.map(item => ({
    title: item.title, summary: item.summary, why: item.why, next_action: item.next_action,
    owner_role: item.owner_role, discuss_at_next_meeting: item.discuss_at_next_meeting,
    timeframe: item.timeframe, ...sourceInfo(item.sources),
  }));
  const summary = audience === "family"
    ? r.plain_language_summary ?? r.professional_summary
    : r.professional_summary ?? r.plain_language_summary;
  const messages = r.audience_messages?.[audience];
  const iep = r.iep_plan_summary;
  // ReportView accepts the historical report type and separately validates the
  // newer identity snapshot before rendering it. The transport remains JSON.
  return {
    ...legacy.data,
    schema_version: 2,
    student_snapshot: snapshot.success ? snapshot.data : identity.data,
    iep_plan_summary: iep ? {
      plan_date_start: iep.plan_date_start, plan_date_end: iep.plan_date_end,
      present_levels: iep.present_levels, transition_goals: iep.transition_goals,
      accommodations: iep.accommodations, services: iep.services, caveats: iep.caveats,
    } : undefined,
    postsecondary_education_recs: recommendations(r.postsecondary_education_recs),
    employment_pathway_recs: recommendations(r.employment_pathway_recs),
    independent_living_recs: recommendations(r.independent_living_recs),
    community_participation_recs: recommendations(r.community_participation_recs),
    resource_matches: r.resource_matches?.map(item => ({
      title: item.title, url: reportWebDestination(item.url), summary: item.summary, why: item.why,
      next_action: item.next_action, owner_role: item.owner_role, ...sourceInfo(item.sources),
    })),
    partner_matches: r.partner_matches?.map(item => ({
      title: item.title, organization: item.organization, url: reportWebDestination(item.url), owner_role: item.owner_role, why: item.why,
      next_action: item.next_action, readiness_level: item.readiness_level, ...sourceInfo(item.sources),
    })),
    missing_information_v2: r.missing_information_v2,
    student_action_plan: audience === "family" ? r.student_action_plan : undefined,
    family_action_plan_v2: r.family_action_plan_v2,
    educator_action_plan_v2: audience === "educator" ? r.educator_action_plan_v2 : undefined,
    cross_cutting_horizons: r.cross_cutting_horizons,
    meeting_prep_questions: r.meeting_prep_questions?.filter(q => audience === "educator" || q.for_audience !== "educator"),
    audience_messages: messages ? { [audience]: {
      postsecondary_education: messages.postsecondary_education,
      employment_pathway: messages.employment_pathway,
      independent_living: messages.independent_living,
      community_participation: messages.community_participation,
    } } : undefined,
    inputs_used_summary: r.inputs_used ? summarizeReportInputs(r.inputs_used) : undefined,
    spin: r.spin, readiness_indicators: r.readiness_indicators,
    confidence: r.confidence, needs_review_flags: r.needs_review_flags,
    ...(audience === "family" ? { plain_language_summary: summary } : { professional_summary: summary }),
    change_summary: r.change_summary,
  } as unknown as PathwayReport;
}
