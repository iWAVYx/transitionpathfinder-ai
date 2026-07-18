import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { OpportunityMatches } from "@/components/demo/OpportunityMatches";

/**
 * Marketing preview of the Partner Network matcher for /platform.
 * Reuses the same StudentSwitcher + OpportunityMatches components that
 * power /demo, so visitors see the real, explainable, age-safeguarded
 * matching engine before entering the demo.
 */
export function PlatformMatchesPreview() {
  return (
    <section className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          The Partner Network, Live
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Explainable Matches, With Age-Safeguards Built In.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Switch students to see how the same matcher re-ranks opportunities by
          grade, goals, and environment fit — and hides anything that isn't
          age-appropriate.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3">
        <StudentSwitcher compact />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3 w-3" />
          Age-Safeguards Active
        </span>
      </div>

      <OpportunityMatches compact limit={2} />

      <div className="mt-6 flex justify-center">
        <Link
          to="/demo"
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/5"
        >
          Walk the full profile → pathway → partners tour
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
