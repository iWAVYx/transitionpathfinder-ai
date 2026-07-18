/**
 * PremiumPartnerToolkitTile — the single new tile authorized for the
 * Partner dashboard. Reflects the currently selected listing plan:
 *
 * - Free    → locked preview + "Compare plans" CTA
 * - Premium → active state + link to the premium-benefits page
 *
 * It is intentionally kept as ONE tile — it does not fan out into a card
 * per premium feature, and it does not merge with PartnerForward.
 */

import { Link } from "@tanstack/react-router";
import { Sparkles, Lock } from "lucide-react";
import { useDemoPartnerPlan } from "@/lib/demo/use-role-context";

export function PremiumPartnerToolkitTile() {
  const { plan, setPlan } = useDemoPartnerPlan();
  const isPremium = plan.id === "premium";

  return (
    <section
      aria-label="Premium Partner Toolkit"
      className={`rounded-2xl border p-5 shadow-sm transition-colors ${
        isPremium
          ? "border-primary/40 bg-primary/5"
          : "border-dashed border-border bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            isPremium ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {isPremium ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {isPremium ? "Active · Premium listing" : "Locked preview · Free listing"}
          </p>
          <h3 className="mt-1 font-display text-lg text-foreground">
            Premium Partner Toolkit
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isPremium
              ? "Featured placement, expanded opportunity postings, engagement analytics, explainable match insights, consent-based connection tools, team access, and premium onboarding are enabled on this listing."
              : "Unlock featured placement, unlimited opportunities, engagement analytics, explainable match insights, consent-based connection tools, and team member access. Premium never expands access to protected student data."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isPremium ? (
              <Link
                to="/partnerforward"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                View premium benefits
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPlan("premium")}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Try Premium in demo
                </button>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/60"
                >
                  Compare plans
                </Link>
              </>
            )}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Distinct from PartnerForward, which covers incentives, funding, and
            partner expansion supports. This toolkit represents paid platform
            listing and workflow capabilities.
          </p>
        </div>
      </div>
    </section>
  );
}
