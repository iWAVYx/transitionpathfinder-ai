import { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Users,
  GraduationCap,
  HeartHandshake,
  User,
  Calendar,
} from "lucide-react";
import {
  generateReadinessInsights,
  type ReadinessInsights,
} from "@/lib/readiness-insights.functions";

type Props = {
  studentId: string;
  studentFirstName: string;
  /** When true, render a compact summary suitable for dashboards. */
  compact?: boolean;
  className?: string;
};

const STATUS_META: Record<
  ReadinessInsights["pillar_callouts"][number]["status"],
  { label: string; chip: string; dot: string }
> = {
  strength: {
    label: "Strength",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  steady: {
    label: "Steady",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
  },
  growing: {
    label: "Growing",
    chip: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
  },
  needs_focus: {
    label: "Needs focus",
    chip: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
  },
};

const WHO_META: Record<
  ReadinessInsights["friendly_next_steps"][number]["who"],
  { label: string; Icon: typeof Users }
> = {
  family: { label: "Family", Icon: HeartHandshake },
  student: { label: "Student", Icon: User },
  educator: { label: "Educator", Icon: GraduationCap },
  team: { label: "Team", Icon: Users },
};

const WHEN_LABEL: Record<
  ReadinessInsights["friendly_next_steps"][number]["when"],
  string
> = {
  this_week: "This week",
  this_month: "This month",
  before_next_meeting: "Before next meeting",
};

export function ReadinessInsightsCard({
  studentId,
  studentFirstName,
  compact = false,
  className,
}: Props) {
  const [insights, setInsights] = useState<ReadinessInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateReadinessInsights({
        data: { student_id: studentId },
      });
      setInsights(res ?? null);
      setHasGenerated(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't generate insights right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Auto-run once per mount for a friendlier first impression.
  useEffect(() => {
    if (!hasGenerated && !loading) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const wrapBase =
    "rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-soft sm:p-6";

  if (loading && !insights) {
    return (
      <div className={`${wrapBase} ${className ?? ""}`}>
        <Header studentFirstName={studentFirstName} loading />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div className={`${wrapBase} ${className ?? ""}`}>
        <Header studentFirstName={studentFirstName} />
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void run()}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-rose-100"
            >
              <RefreshCw className="h-3 w-3" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  if (compact) {
    const topStep = insights.friendly_next_steps[0];
    return (
      <div className={`${wrapBase} ${className ?? ""}`}>
        <Header studentFirstName={studentFirstName} onRefresh={() => void run()} refreshing={loading} />
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          {insights.readiness_summary}
        </p>
        {topStep && (
          <div className="mt-4 rounded-2xl border bg-background/80 p-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                <ArrowRight className="h-3 w-3" />
                Next step
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {WHEN_LABEL[topStep.when]}
              </span>
              <span className="inline-flex items-center gap-1">
                {(() => {
                  const W = WHO_META[topStep.who];
                  return (
                    <>
                      <W.Icon className="h-3 w-3" /> {W.label}
                    </>
                  );
                })()}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold">{topStep.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{topStep.why}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${wrapBase} ${className ?? ""}`}>
      <Header studentFirstName={studentFirstName} onRefresh={() => void run()} refreshing={loading} />

      <h3 className="mt-3 font-display text-xl font-medium tracking-tight sm:text-2xl">
        {insights.headline}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
        {insights.readiness_summary}
      </p>

      {/* Pillar callouts */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {insights.pillar_callouts.map((p, i) => {
          const meta = STATUS_META[p.status];
          return (
            <div
              key={`${p.pillar}-${i}`}
              className="rounded-2xl border bg-background/80 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{p.pillar}</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                  {typeof p.score === "number" ? ` · ${p.score}` : ""}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/90">{p.what_we_see}</p>
              <p className="mt-1 text-xs italic text-muted-foreground">
                {p.why_it_matters}
              </p>
            </div>
          );
        })}
      </div>

      {/* Friendly next steps */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Friendly next steps
        </p>
        <ul className="mt-3 space-y-3">
          {insights.friendly_next_steps.map((s, i) => {
            const W = WHO_META[s.who];
            return (
              <li
                key={`${s.title}-${i}`}
                className="rounded-2xl border bg-background/80 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    <W.Icon className="h-3 w-3" /> {W.label}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {WHEN_LABEL[s.when]}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold">{s.title}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                  {s.steps.map((step, j) => (
                    <li key={j}>{step}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  {s.why}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Encouragement */}
      <blockquote className="mt-5 rounded-2xl border-l-4 border-primary/50 bg-primary/5 px-4 py-3 text-sm italic text-foreground/90">
        {insights.encouragement}
      </blockquote>

      {/* Sources */}
      {insights.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {insights.sources.map((s, i) => (
            <span
              key={`${s.kind}-${i}`}
              className="rounded-full border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({
  studentFirstName,
  onRefresh,
  refreshing,
  loading,
}: {
  studentFirstName: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Readiness Insights
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {loading
            ? `Reading ${studentFirstName}'s IEP, documents, and priorities…`
            : `Personalized for ${studentFirstName} from their IEP, documents, voice, and priorities.`}
        </p>
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      )}
    </div>
  );
}
