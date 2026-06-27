/**
 * v2.1 additive Pathway Report sections.
 *
 * Renders Student Snapshot, plain-language vs professional summary,
 * Strengths/Preferences/Interests/Needs, Readiness Indicators, Needs
 * Review flags, Confidence info, and a "What changed since last report"
 * line. All fields are optional — the component renders nothing when the
 * underlying data is absent, so legacy v2 reports are unaffected.
 *
 * Presentation: editorial primitives from PublicationPage.
 */
import {
  User2,
  Sparkles,
  Heart,
  Compass as CompassIcon,
  AlertCircle,
  Gauge,
  History,
  CheckCircle2,
  CircleDashed,
  Circle,
  CircleDot,
  Database,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  isV2,
  type StudentSnapshot,
  type SPIN,
  type ReadinessIndicator,
  type ConfidenceInfo,
  type NeedsReviewFlag,
  type InputsUsed,
} from "@/lib/pathway-v2";
import type { V2Audience } from "@/components/pathway/ReportV2Sections";
import {
  PublicationPage,
  PublicationCallout,
  PublicationSidebar,
  PublicationSource,
} from "@/components/publication/PublicationPage";

const LEVEL_META: Record<
  ReadinessIndicator["level"],
  { label: string; pct: number; icon: typeof Circle; tone: string }
> = {
  emerging:   { label: "Emerging",    pct: 20, icon: Circle,       tone: "text-muted-foreground" },
  developing: { label: "Developing",  pct: 45, icon: CircleDashed,  tone: "text-amber-600" },
  progressing:{ label: "Progressing", pct: 70, icon: CircleDot,     tone: "text-primary" },
  ready:      { label: "Ready",       pct: 92, icon: CheckCircle2,  tone: "text-emerald-600" },
};

const CONFIDENCE_META: Record<
  ConfidenceInfo["overall"],
  { label: string; calloutKind: "means" | "matters" | "next" | "source"; description: string }
> = {
  low: {
    label: "Low Confidence",
    calloutKind: "next",
    description: "Treat this as a starting draft. Verify with the team before acting.",
  },
  medium: {
    label: "Medium Confidence",
    calloutKind: "means",
    description: "Solid inputs; some sections still need team review.",
  },
  high: {
    label: "High Confidence",
    calloutKind: "source",
    description: "Inputs are comprehensive and recent.",
  },
};

/* ─── Snapshot Header ──────────────────────────────────────────────────── */

export function ReportV2SnapshotHeader({
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
  const snap = r.student_snapshot as StudentSnapshot | undefined;
  const summary =
    audience === "educator"
      ? (r.professional_summary as string | undefined) ??
        (r.plain_language_summary as string | undefined)
      : (r.plain_language_summary as string | undefined) ??
        (r.professional_summary as string | undefined);
  const changeSummary = r.change_summary as string | undefined;

  if (!snap && !summary && !changeSummary) return null;

  return (
    <section aria-label="Student snapshot">
      <PublicationPage
        kicker="Section 01"
        chapter={snap?.display_name ?? studentName}
        dek="Student profile overview"
        folio="p. 01"
      >
        {/* Identity badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
            <User2 className="h-5 w-5" />
          </span>
          {(snap?.grade || snap?.age || snap?.school || snap?.district || snap?.case_manager || snap?.plan_type) && (
            <ul className="flex flex-wrap gap-1.5">
              {snap?.grade        && <li><Badge variant="secondary" className="text-[10px]">Grade {snap.grade}</Badge></li>}
              {typeof snap?.age === "number" && <li><Badge variant="secondary" className="text-[10px]">Age {snap.age}</Badge></li>}
              {snap?.plan_type    && <li><Badge variant="secondary" className="text-[10px]">{snap.plan_type}</Badge></li>}
              {snap?.school       && <li><Badge variant="outline" className="text-[10px]">{snap.school}</Badge></li>}
              {snap?.district     && <li><Badge variant="outline" className="text-[10px]">{snap.district}</Badge></li>}
              {snap?.case_manager && <li><Badge variant="outline" className="text-[10px]">Case manager: {snap.case_manager}</Badge></li>}
            </ul>
          )}
        </div>

        {/* Headline */}
        {snap?.headline && (
          <p className="border-b border-[color:var(--pub-rule-soft)] py-4 text-sm text-foreground/90 leading-relaxed">
            {snap.headline}
          </p>
        )}

        {/* Summary callout */}
        {summary && (
          <div className="py-4 border-b border-[color:var(--pub-rule-soft)]">
            <PublicationCallout
              kind="means"
              title={audience === "educator" ? "Professional Summary" : "Plain-Language Summary"}
            >
              <p className="whitespace-pre-wrap">{summary}</p>
            </PublicationCallout>
          </div>
        )}

        {/* Provenance */}
        {(snap?.last_updated || changeSummary) && (
          <div className="pt-3 flex flex-wrap items-center gap-3">
            {snap?.last_updated && (
              <PublicationSource>
                <span className="inline-flex items-center gap-1">
                  <History className="h-3.5 w-3.5" />
                  Last updated {snap.last_updated}
                </span>
              </PublicationSource>
            )}
            {changeSummary && (
              <PublicationSource>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {changeSummary}
                </span>
              </PublicationSource>
            )}
          </div>
        )}
      </PublicationPage>
    </section>
  );
}

/* ─── Extras Body ──────────────────────────────────────────────────────── */

export function ReportV2ExtrasBody({
  content,
  audience,
}: {
  content: unknown;
  audience: V2Audience;
}) {
  if (!isV2(content)) return null;
  const r = content as Record<string, unknown>;
  const spin       = r.spin as SPIN | undefined;
  const readiness  = (r.readiness_indicators as ReadinessIndicator[] | undefined) ?? [];
  const flags      = (r.needs_review_flags as NeedsReviewFlag[] | undefined) ?? [];
  const confidence = r.confidence as ConfidenceInfo | undefined;

  const showAny =
    Boolean(spin && (spin.strengths?.length || spin.preferences?.length || spin.interests?.length || spin.needs?.length)) ||
    readiness.length > 0 ||
    flags.length > 0 ||
    Boolean(confidence);

  if (!showAny) return null;

  return (
    <>
      {/* ── SPIN ─────────────────────────────────────────────────────── */}
      {spin && (spin.strengths?.length || spin.preferences?.length || spin.interests?.length || spin.needs?.length) ? (
        <section id="v2-spin">
          <PublicationPage
            kicker="Section 02"
            chapter="Strengths, Preferences, Interests & Needs"
            dek="Drawn from the student profile, Student Voice, and team input. These shape every recommendation below."
            folio="p. 02"
          >
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Heart className="h-5 w-5" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <SpinList label="Strengths"      items={spin.strengths}   tone="emerald" />
              <SpinList label="Preferences"    items={spin.preferences} tone="primary" />
              <SpinList label="Interests"      items={spin.interests}   tone="violet" />
              <SpinList label="Needs / Supports" items={spin.needs}     tone="amber" />
            </div>
          </PublicationPage>
        </section>
      ) : null}

      {/* ── Readiness Indicators ─────────────────────────────────────── */}
      {readiness.length > 0 && (
        <section id="v2-readiness-indicators">
          <PublicationPage
            kicker="Section 03"
            chapter="Readiness Indicators"
            dek="Where the student is right now across the transition domains the team is tracking."
            folio="p. 03"
          >
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Gauge className="h-5 w-5" />
            </div>
            <ul className="divide-y divide-[color:var(--pub-rule-soft)]">
              {readiness.map((ind, i) => {
                const meta = LEVEL_META[ind.level];
                const Icon = meta.icon;
                return (
                  <li key={i} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {/* Urbanist eyebrow */}
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-sans mb-0.5">
                          Domain
                        </p>
                        {/* Instrument Serif headline */}
                        <p className="font-display text-base sm:text-lg">{ind.domain}</p>
                        {ind.note && (
                          <p className="mt-1 text-sm text-muted-foreground">{ind.note}</p>
                        )}
                      </div>
                      <span className={`inline-flex flex-none items-center gap-1 text-xs ${meta.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </div>
                    <div
                      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${meta.pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </PublicationPage>
        </section>
      )}

      {/* ── Needs Review flags ───────────────────────────────────────── */}
      {flags.length > 0 && (
        <section id="v2-needs-review">
          <PublicationPage
            kicker="Section 04"
            chapter="Needs Review"
            dek="Sections the team should look at before this report is used at a meeting."
            folio="p. 04"
          >
            <div className="flex items-center gap-2 mb-4 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <ul className="divide-y divide-[color:var(--pub-rule-soft)]">
              {flags.map((f, i) => (
                <li key={i} className="py-4">
                  <PublicationCallout kind="next" title={f.section.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
                    {f.owner_role && (
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                        Follow-up: {f.owner_role.replace(/_/g, " ")}
                      </p>
                    )}
                    <p className="text-sm">{f.reason}</p>
                  </PublicationCallout>
                </li>
              ))}
            </ul>
          </PublicationPage>
        </section>
      )}

      {/* ── Confidence ───────────────────────────────────────────────── */}
      {confidence && (
        <section id="v2-confidence">
          <PublicationPage
            kicker="Section 05"
            chapter={CONFIDENCE_META[confidence.overall].label}
            dek={CONFIDENCE_META[confidence.overall].description}
            folio="p. 05"
          >
            <div className="flex items-center gap-2 mb-4 text-primary">
              <CompassIcon className="h-5 w-5" />
            </div>

            <PublicationCallout
              kind={CONFIDENCE_META[confidence.overall].calloutKind}
              title="Report Confidence"
            >
              {confidence.rationale && (
                <p className="text-sm mb-2">{confidence.rationale}</p>
              )}
              {confidence.caveats?.length ? (
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  {confidence.caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : null}
            </PublicationCallout>

            {audience !== "educator" && (
              <div className="mt-4">
                <PublicationSource>
                  TransitionForward is a planning companion — it does not replace IEP / PPT / CT-SEDS team decisions.
                </PublicationSource>
              </div>
            )}
          </PublicationPage>
        </section>
      )}
    </>
  );
}

/* ─── SpinList (editorial hairline-rule rows) ──────────────────────────── */

function SpinList({
  label,
  items,
  tone,
}: {
  label: string;
  items?: string[];
  tone: "emerald" | "primary" | "violet" | "amber";
}) {
  if (!items?.length) return null;
  const dotTone: Record<typeof tone, string> = {
    emerald: "bg-emerald-500",
    primary: "bg-primary",
    violet:  "bg-violet-500",
    amber:   "bg-amber-500",
  };
  return (
    <div>
      {/* Urbanist eyebrow */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-sans mb-1">
        {label}
      </p>
      <ul className="divide-y divide-[color:var(--pub-rule-soft)]">
        {items.map((t, i) => (
          <li
            key={i}
            className="border-b border-[color:var(--pub-rule-soft)] py-2 flex items-start gap-2 text-sm leading-snug"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${dotTone[tone]}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Inputs Used accordion ────────────────────────────────────────────── */

/**
 * ReportV2InputsUsed — collapsed-by-default panel showing which data sources
 * the AI used to generate this report. Hides itself completely if the
 * report has no `inputs_used` block (e.g. legacy reports).
 */
export function ReportV2InputsUsed({ content }: { content: unknown }) {
  const [open, setOpen] = useState(false);
  if (!isV2(content)) return null;
  const r = content as Record<string, unknown>;
  const inputs = r.inputs_used as InputsUsed | undefined;
  if (!inputs) return null;

  type Row = { label: string; hint?: string; present: boolean };
  const rows: Row[] = [
    { label: "Student Profile",       present: Boolean(inputs.profile) },
    { label: "Intake Responses",      present: Boolean(inputs.intake) },
    {
      label: "Student Voice",
      hint: inputs.student_voice_keys?.length
        ? `${inputs.student_voice_keys.length} response${inputs.student_voice_keys.length === 1 ? "" : "s"}`
        : undefined,
      present: !!inputs.student_voice_keys?.length,
    },
    {
      label: "IEP Documents",
      hint: inputs.iep_doc_ids?.length
        ? `${inputs.iep_doc_ids.length} document${inputs.iep_doc_ids.length === 1 ? "" : "s"}`
        : undefined,
      present: !!inputs.iep_doc_ids?.length,
    },
    {
      label: "IEP Extractions",
      hint: inputs.iep_extraction_ids?.length
        ? `${inputs.iep_extraction_ids.length} extraction${inputs.iep_extraction_ids.length === 1 ? "" : "s"}`
        : undefined,
      present: !!inputs.iep_extraction_ids?.length,
    },
    {
      label: "Transition Goals",
      hint: inputs.goal_ids?.length
        ? `${inputs.goal_ids.length} goal${inputs.goal_ids.length === 1 ? "" : "s"}`
        : undefined,
      present: !!inputs.goal_ids?.length,
    },
    {
      label: "Readiness Check",
      hint: inputs.readiness_category_count
        ? `${inputs.readiness_category_count} domain${inputs.readiness_category_count === 1 ? "" : "s"}`
        : inputs.readiness_at
          ? "Captured"
          : undefined,
      present: Boolean(inputs.readiness_at || inputs.readiness_category_count),
    },
    {
      label: "Action Items in Flight",
      hint: inputs.action_item_ids?.length ? `${inputs.action_item_ids.length} open` : undefined,
      present: !!inputs.action_item_ids?.length,
    },
    {
      label: "Meeting Prep Notes",
      hint: inputs.meeting_prep_ids?.length
        ? `${inputs.meeting_prep_ids.length} note${inputs.meeting_prep_ids.length === 1 ? "" : "s"}`
        : undefined,
      present: !!inputs.meeting_prep_ids?.length,
    },
    {
      label: "Saved Resources",
      hint: inputs.saved_resource_ids?.length ? `${inputs.saved_resource_ids.length} saved` : undefined,
      present: !!inputs.saved_resource_ids?.length,
    },
    {
      label: "Partner Matches",
      hint: inputs.partner_match_ids?.length ? `${inputs.partner_match_ids.length} matched` : undefined,
      present: !!inputs.partner_match_ids?.length,
    },
    {
      label: "Family Priorities",
      hint: inputs.family_priorities_count ? `${inputs.family_priorities_count} on file` : undefined,
      present: !!inputs.family_priorities_count,
    },
  ];

  const presentCount = rows.filter((row) => row.present).length;
  const generatedAt = inputs.generated_at
    ? new Date(inputs.generated_at).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <section
      id="v2-inputs-used"
      aria-label="Sources used in this report"
      className="no-print"
    >
      <PublicationPage
        kicker="Sources"
        chapter="Sources Used in This Report"
        dek={`${presentCount} of ${rows.length} data sources contributed${generatedAt ? ` · generated ${generatedAt}` : ""}.`}
        folio="p. 06"
      >
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Database className="h-5 w-5" />
        </div>

        {/* Editorial details/summary accordion */}
        <details
          open={open}
          onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
          id="v2-inputs-used-body"
        >
          <summary
            className="cursor-pointer select-none list-none border-b border-[color:var(--pub-rule-soft)] pb-3 mb-1 flex items-center justify-between text-sm font-semibold text-foreground"
            aria-expanded={open}
          >
            <span>{open ? "Hide sources" : "Show all sources"}</span>
            <span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">
              {presentCount} / {rows.length} present
            </span>
          </summary>

          <PublicationSidebar label="Inputs Used">
            <ul className="grid gap-1 sm:grid-cols-2">
              {rows.map((row, i) => (
                <li
                  key={i}
                  className={`border-b border-[color:var(--pub-rule-soft)] py-3 flex items-start gap-2 ${
                    row.present ? "" : "opacity-50"
                  }`}
                >
                  {row.present ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
                  )}
                  <div>
                    {/* Urbanist eyebrow */}
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                      {row.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.hint ?? (row.present ? "Provided" : "Not provided")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </PublicationSidebar>
        </details>
      </PublicationPage>
    </section>
  );
}
