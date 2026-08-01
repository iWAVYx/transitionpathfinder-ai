import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/billing/StripeEmbeddedCheckout";
import { PLANS, TRIAL_PERIOD_DAYS, type PlanKey } from "@/lib/billing/plans";
import { isPaymentsConfigured } from "@/lib/stripe";
import { useEntitlement } from "@/hooks/use-entitlement";

interface UpgradePromptProps {
  /** Which personal plan unlocks this feature. */
  plan?: Extract<PlanKey, "individual_pathway" | "educator_solo">;
  /** Name of the gated feature, used in the prompt copy. */
  feature: string;
  className?: string;
}

/**
 * Inline upsell shown where an unentitled user hits a paid feature.
 * Renders nothing once the user already has active access — including
 * access sponsored by a school or district.
 */
export function UpgradePrompt({
  plan = "individual_pathway",
  feature,
  className,
}: UpgradePromptProps) {
  const { isActive, loading } = useEntitlement();
  const [open, setOpen] = useState(false);

  if (loading || isActive || !isPaymentsConfigured()) return null;

  const definition = PLANS[plan];


  return (
    <div
      className={`rounded-lg border border-primary/30 bg-primary/5 p-4 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">{feature} is part of {definition.name}</p>
            <p className="text-sm text-muted-foreground">
              Try it free for {TRIAL_PERIOD_DAYS} days. Cancel before the trial
              ends and you are not charged.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Start Free Trial
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start Your {definition.name} Trial</DialogTitle>
          </DialogHeader>
          <StripeEmbeddedCheckout
            priceId={definition.monthlyPriceId ?? definition.yearlyPriceId ?? ""}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
