/**
 * v2.1 additive Pathway Report sections.
 *
 * Renders Student Snapshot, plain-language vs professional summary,
 * Strengths/Preferences/Interests/Needs, Readiness Indicators, Needs
 * Review flags, Confidence info, and a "What changed since last report"
 * line. All fields are optional — the component renders nothing when the
 * underlying data is absent, so legacy v2 reports are unaffected.
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  isV2,
  type StudentSnapshot,
  type SPIN,
  type ReadinessIndicator,
  type ConfidenceInfo,
  type NeedsReviewFlag,
} from "@/lib/pathway-v2";
import type { V2Audience } from "@/components/pathway/ReportV2Sections";

const LEVEL_META: Record<
  ReadinessIndicator["level"],
  { label: string; pct: number; icon: typeof Circle; tone: string }
> = {
  emerging: { label: "Emerging", pct: 20, icon: Circle, tone: "text-muted-foreground" },
  developing: { label: "Developing", pct: 45, icon: CircleDashed, tone: "text-amber-600" },
  progressing: { label: "Progressing", pct: 70, icon: CircleDot, tone: "text-primary" },
  ready: { label: "Ready", pct: 92, icon: CheckCircle2, tone: "text-emerald-600" },
};

const CONFIDENCE_META: Record<
  ConfidenceInfo["overall"],
  { label: string; tone: string; description: string }
> = {
  low: {
    label: "Low confidence",
    tone: "border-amber-300/60 bg-amber-50/40 dark:bg-amber-900/10",
    description: "Treat this as a starting draft. Verify with the team before acting.",
  },
  medium: {
    label: "Medium confidence",
    tone: "border-primary/30 bg-primary/5",
    description: "Solid inputs; some sections still need team review.",
  },
  high: {
    label: "High confidence",
    tone: "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-900/10",
    description: "Inputs are comprehensive and recent.",
  },
};

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
    <section
      aria-label="Student snapshot"
      className="mx-auto max-w-5xl space-y-3 px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
            <User2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Student snapshot
            </p>
            <h2 className="mt-0.5 font-display text-xl sm:text-2xl">
              {snap?.display_name ?? studentName}
            </h2>
            {(snap?.grade || snap?.age || snap?.school || snap?.district || snap?.case_manager || snap?.plan_type) && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {snap?.grade && <li><Badge variant="secondary" className="text-[10px]">Grade {snap.grade}</Badge></li>}
                {typeof snap?.age === "number" && <li><Badge variant="secondary" className="text-[10px]">Age {snap.age}</Badge></li>}
                {snap?.plan_type && <li><Badge variant="secondary" className="text-[10px]">{snap.plan_type}</Badge></li>}
                {snap?.school && <li><Badge variant="outline" className="text-[10px]">{snap.school}</Badge></li>}
                {snap?.district && <li><Badge variant="outline" className="text-[10px]">{snap.district}</Badge></li>}
                {snap?.case_manager && <li><Badge variant="outline" className="text-[10px]">Case manager: {snap.case_manager}</Badge></li>}
              </ul>
            )}
            {snap?.headline && (
              <p className="mt-3 text-sm text-foreground/90">{snap.headline}</p>
            )}
            {summary && (
              <div className="mt-4 rounded-2xl border border-dashed bg-background/60 p-3 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {audience === "educator" ? "Professional summary" : "Plain-language summary"}
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
            )}
            {(snap?.last_updated || changeSummary) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {snap?.last_updated && (
                  <span className="inline-flex items-center gap-1">
                    <History className="h-3.5 w-3.5" />
                    Last updated {snap.last_updated}
                  </span>
                )}
                {changeSummary && (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {changeSummary}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReportV2ExtrasBody({
  content,
  audience,
}: {
  content: unknown;
  audience: V2Audience;
}) {
  if (!isV2(content)) return null;
  const r = content as Record<string, unknown>;
  const spin = r.spin as SPIN | undefined;
  const readiness = (r.readiness_indicators as ReadinessIndicator[] | undefined) ?? [];
  const flags = (r.needs_review_flags as NeedsReviewFlag[] | undefined) ?? [];
  const confidence = r.confidence as ConfidenceInfo | undefined;

  const showAny =
    Boolean(spin && (spin.strengths?.length || spin.preferences?.length || spin.interests?.length || spin.needs?.length)) ||
    readiness.length > 0 ||
    flags.length > 0 ||
    Boolean(confidence);

  if (!showAny) return null;

  return (
    <>
      {spin &&
        (spin.strengths?.length ||
          spin.preferences?.length ||
          spin.interests?.length ||
          spin.needs?.length) ? (
        <section
          id="v2-spin"
          className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6"
        >
          <header className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg sm:text-xl">
                Strengths, Preferences, Interests & Needs
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Drawn from the student profile, Student Voice, and team input. These
                shape every recommendation below.
              </p>
            </div>
          </header>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SpinList label="Strengths" items={spin.strengths} tone="emerald" />
            <SpinList label="Preferences" items={spin.preferences} tone="primary" />
            <SpinList label="Interests" items={spin.interests} tone="violet" />
            <SpinList label="Needs / supports" items={spin.needs} tone="amber" />
          </div>
        </section>
      ) : null}

      {readiness.length > 0 && (
        <section
          id="v2-readiness-indicators"
          className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6"
        >
          <header className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg sm:text-xl">Readiness Indicators</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Where the student is right now across the transition domains the
                team is tracking.
              </p>
            </div>
          </header>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {readiness.map((ind, i) => {
              const meta = LEVEL_META[ind.level];
              const Icon = meta.icon;
              return (
                <li key={i} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{ind.domain}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${meta.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${meta.pct}%` }}
                    />
                  </div>
                  {ind.note && (
                    <p className="mt-2 text-xs text-muted-foreground">{ind.note}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {flags.length > 0 && (
        <section
          id="v2-needs-review"
          className="rounded-3xl border border-amber-300/60 bg-card p-5 shadow-soft sm:p-6"
        >
          <header className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg sm:text-xl">Needs Review</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sections the team should look at before this report is used at a
                meeting.
              </p>
            </div>
          </header>
          <ul className="mt-4 space-y-2">
            {flags.map((f, i) => (
              <li
                key={i}
                className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-3 dark:bg-amber-900/10"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {f.section.replace(/_/g, " ")}
                  </Badge>
                  {f.owner_role && (
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Follow-up: {f.owner_role.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm">{f.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {confidence && (
        <section
          id="v2-confidence"
          className={`rounded-3xl border p-5 shadow-soft sm:p-6 ${CONFIDENCE_META[confidence.overall].tone}`}
        >
          <header className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
              <CompassIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl">
                {CONFIDENCE_META[confidence.overall].label}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {CONFIDENCE_META[confidence.overall].description}
              </p>
            </div>
          </header>
          {confidence.rationale && (
            <p className="mt-3 text-sm">{confidence.rationale}</p>
          )}
          {confidence.caveats?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {confidence.caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : null}
          {audience !== "educator" && (
            <p className="mt-3 text-xs text-muted-foreground">
              TransitionForward is a planning companion — it does not replace
              IEP / PPT / CT-SEDS team decisions.
            </p>
          )}
        </section>
      )}
    </>
  );
}

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
    violet: "bg-violet-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-snug">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${dotTone[tone]}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
