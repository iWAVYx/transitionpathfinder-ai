import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { DEMO_PROFILES, DEMO_PROFILE_ORDER } from "@/lib/demo/demo-profiles";

/**
 * Marketing teaser: three demo cohort students → deep-link into the
 * age-aware pathway report for each. Static, SSR-safe — no router hooks.
 */
export function DemoCohortStrip({
  eyebrow = "See it for three real students",
  title = "One Platform, Three Very Different Pathways.",
  subtitle = "Jordan, Riley, and Sam show how TransitionForward adapts by grade, goals, and safeguards — from Grade 7 exploration through postsecondary planning.",
  ctaLabel = "Take the end-to-end tour",
  ctaTo = "/demo",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaTo?: string;
} = {}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
        {DEMO_PROFILE_ORDER.map((id) => {
          const p = DEMO_PROFILES[id];
          return (
            <li key={id}>
              <Link
                to="/demo/report"
                search={{ student: id }}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">
                    {p.emoji}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {p.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.demographics.gradeLabel} · {p.demographics.townRegion}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {p.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  See {p.shortName}'s Pathway Report
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex justify-center">
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
        >
          <Sparkles className="h-4 w-4" />
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
