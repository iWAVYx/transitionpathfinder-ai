import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

const ENCOURAGEMENTS = [
  "Ready to move a pathway forward today?",
  "Your dashboard is ready. Pick up where you left off.",
  "Small steps, real progress. Let's keep going.",
  "Every check-in moves a plan forward.",
  "Glad you're here. Let's make this a good week.",
];

export interface WelcomeBannerProps {
  firstName?: string | null;
}

export function WelcomeBanner({ firstName }: WelcomeBannerProps) {
  const subline = useMemo(() => {
    // Stable per-day so users don't see it flicker on every render.
    const day = new Date();
    const seed =
      day.getFullYear() * 1000 + day.getMonth() * 32 + day.getDate();
    return ENCOURAGEMENTS[seed % ENCOURAGEMENTS.length];
  }, []);

  const name = (firstName || "").trim();
  const greeting = name ? `Welcome back, ${name}.` : "Welcome back.";

  return (
    <section
      aria-label="Welcome"
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-hero p-5 shadow-soft sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Your hub
          </p>
          <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {greeting}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {subline}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to="/pathway"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            Create a Pathway Report
          </Link>
          <Link
            to="/students"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur hover:bg-background"
          >
            Open students
          </Link>
        </div>
      </div>
    </section>
  );
}
