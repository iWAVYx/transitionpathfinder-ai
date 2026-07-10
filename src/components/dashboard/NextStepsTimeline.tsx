import { CalendarClock, Rocket, Target, Milestone } from "lucide-react";

/**
 * NextStepsTimeline — 30 / 90 / 180 / 365-day horizon strip.
 *
 * Renders the four action horizons from the Pathway Report (v2) in a
 * left-to-right timeline with concrete items per horizon. Ships with
 * sample content so it previews before a report has been generated.
 */

type HorizonKey = "d30" | "d90" | "d180" | "d365";

export interface HorizonBlock {
  label: string;
  window: string;
  items: string[];
}

export type NextStepsTimelineData = Partial<Record<HorizonKey, HorizonBlock>>;

const SAMPLE: Record<HorizonKey, HorizonBlock> = {
  d30: {
    label: "This Month",
    window: "Next 30 Days",
    items: [
      "Finish your Student Voice prompts",
      "Book the PPT meeting",
      "Request a transition assessment",
    ],
  },
  d90: {
    label: "This Quarter",
    window: "Next 90 Days",
    items: [
      "Hold the PPT with a report-driven agenda",
      "Sign the family consent form",
      "Shadow one work environment",
    ],
  },
  d180: {
    label: "Half Year",
    window: "Next 6 Months",
    items: [
      "Tour two college programs",
      "Complete a paid job shadow",
      "Start travel training with a coach",
    ],
  },
  d365: {
    label: "This Year",
    window: "Next 12 Months",
    items: [
      "Apply to a 2-year program",
      "Land a paid internship",
      "Travel independently to work + school",
    ],
  },
};

const ORDER: HorizonKey[] = ["d30", "d90", "d180", "d365"];
const ICONS: Record<HorizonKey, typeof Rocket> = {
  d30: Rocket,
  d90: CalendarClock,
  d180: Target,
  d365: Milestone,
};

export function NextStepsTimeline({
  data,
  title = "Your Next Steps",
  eyebrow = "30 / 90 / 180 / 365-Day Plan",
  description = "Small, concrete steps that ladder up to your postsecondary goals. Each item has an owner in the full plan.",
}: {
  data?: NextStepsTimelineData;
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  const merged: Record<HorizonKey, HorizonBlock> = {
    d30: { ...SAMPLE.d30, ...(data?.d30 ?? {}) },
    d90: { ...SAMPLE.d90, ...(data?.d90 ?? {}) },
    d180: { ...SAMPLE.d180, ...(data?.d180 ?? {}) },
    d365: { ...SAMPLE.d365, ...(data?.d365 ?? {}) },
  };

  return (
    <section
      aria-labelledby="next-steps-timeline-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="next-steps-timeline"
    >
      <header className="border-b border-border/60 pb-4">
        <p className="tf-eyebrow">{eyebrow}</p>
        <h2
          id="next-steps-timeline-title"
          className="mt-1 font-display text-2xl font-medium tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </header>

      <ol className="mt-6 grid gap-4 md:grid-cols-4">
        {ORDER.map((key, idx) => {
          const h = merged[key];
          const Icon = ICONS[key];
          return (
            <li
              key={key}
              className="relative flex h-full flex-col rounded-2xl border bg-background p-4"
            >
              <span
                aria-hidden
                className="absolute -top-3 left-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-4 ring-card"
              >
                {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {h.window}
                  </p>
                  <p className="font-display text-sm font-medium tracking-tight text-foreground">
                    {h.label}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                {h.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                    />
                    <span className="leading-relaxed text-foreground/90">
                      {it}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
