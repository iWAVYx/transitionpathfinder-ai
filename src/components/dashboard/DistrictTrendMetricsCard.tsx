import { TrendingUp, Sparkles, ArrowRight, TrendingDown, Minus } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * DistrictTrendMetricsCard — 6-term trend of key transition outcomes
 * across the district. Simple inline sparklines keep this SSR-safe
 * (no chart library needed).
 */

export interface DistrictTrendSeries {
  label: string;
  unit?: string;
  points: number[];
  target?: number;
  higherIsBetter?: boolean;
  note?: string;
}

export interface DistrictTrendMetricsData {
  terms?: string[];
  series?: DistrictTrendSeries[];
  reportsHref?: string;
}

const SAMPLE: Required<DistrictTrendMetricsData> = {
  reportsHref: "/reports",
  terms: ["F22", "S23", "F23", "S24", "F24", "S25"],
  series: [
    { label: "Indicator 13 Compliance", unit: "%", points: [82, 85, 88, 90, 92, 93], target: 90, higherIsBetter: true, note: "Above target for 3 straight terms." },
    { label: "Seniors With Signed Pathway", unit: "%", points: [61, 65, 70, 74, 79, 84], target: 85, higherIsBetter: true, note: "1 point below target — closing quickly." },
    { label: "Work-Based Learning Placements", unit: "", points: [118, 132, 148, 161, 179, 202], higherIsBetter: true, note: "72% growth vs. baseline term." },
    { label: "Adult-Services Referrals Complete", unit: "%", points: [48, 54, 60, 63, 71, 78], target: 90, higherIsBetter: true, note: "Trending toward target — East Valley lagging." },
    { label: "Days To PPT After Report", unit: " days", points: [22, 19, 17, 15, 14, 12], higherIsBetter: false, note: "Cycle time down 45% since baseline." },
    { label: "Family Voice Statements On File", unit: "%", points: [58, 66, 71, 78, 82, 88], target: 85, higherIsBetter: true, note: "Above target this term." },
  ],
};

function trendDelta(s: DistrictTrendSeries) {
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const raw = last - first;
  const pct = first !== 0 ? Math.round((raw / first) * 100) : 0;
  const positive = s.higherIsBetter === false ? raw < 0 : raw > 0;
  const flat = raw === 0;
  return { raw, pct, positive, flat, last };
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = positive ? "stroke-emerald-500" : "stroke-rose-500";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible" aria-hidden>
      <path d={path} fill="none" className={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = i * step;
        const y = h - ((p - min) / range) * h;
        const isLast = i === points.length - 1;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isLast ? 2.5 : 1.5}
            className={isLast ? (positive ? "fill-emerald-500" : "fill-rose-500") : "fill-muted-foreground/50"}
          />
        );
      })}
    </svg>
  );
}

export function DistrictTrendMetricsCard({
  data,
  isSample = true,
}: {
  data?: DistrictTrendMetricsData;
  isSample?: boolean;
}) {
  const d: Required<DistrictTrendMetricsData> = {
    ...SAMPLE,
    ...(data ?? {}),
    terms: data?.terms ?? SAMPLE.terms,
    series: data?.series ?? SAMPLE.series,
  };

  return (
    <section
      aria-labelledby="district-trend-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="district-trend-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <TrendingUp className="h-3 w-3" aria-hidden /> District Trend Metrics
          </p>
          <h2 id="district-trend-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            6-Term Outcomes Trend
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The direction and magnitude of every headline metric over the last three years — with a target line where one exists.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Terms: {d.terms.join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.reportsHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Analytics <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {d.series.map((s) => {
          const t = trendDelta(s);
          const DeltaIcon = t.flat ? Minus : t.positive ? TrendingUp : TrendingDown;
          const deltaClass = t.flat
            ? "text-muted-foreground"
            : t.positive
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-700 dark:text-rose-300";
          const sign = t.raw > 0 ? "+" : "";
          return (
            <li key={s.label} className="rounded-2xl border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Current: <span className="font-medium text-foreground/90">{t.last}{s.unit}</span>
                    {typeof s.target === "number" && <> · Target: {s.target}{s.unit}</>}
                  </p>
                </div>
                <div className="text-right">
                  <Sparkline points={s.points} positive={t.positive || t.flat} />
                  <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${deltaClass}`}>
                    <DeltaIcon className="h-3 w-3" aria-hidden /> {sign}{t.raw}{s.unit} ({sign}{t.pct}%)
                  </p>
                </div>
              </div>
              {s.note && <p className="mt-2 text-xs text-foreground/80">{s.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
