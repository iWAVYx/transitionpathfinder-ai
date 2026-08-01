import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentTestModeBanner } from "@/components/billing/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/billing/StripeEmbeddedCheckout";
import {
  createPortalSession,
  getMyPersonalBilling,
} from "@/lib/billing/billing.functions";
import { getMySponsorship } from "@/lib/billing/licensing.functions";
import {
  PLANS,
  TRIAL_PERIOD_DAYS,
  planForPriceId,
  subscriptionStatusLabel,
} from "@/lib/billing/plans";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

const PERSONAL_OPTIONS = [
  {
    priceId: PLANS.individual_pathway.monthlyPriceId,
    name: PLANS.individual_pathway.name,
    amount: PLANS.individual_pathway.monthlyAmount,
    cadence: "Per Month · One Student Pathway",
    blurb:
      "One student pathway with up to three connected family accounts — reports, document summaries, and meeting prep.",
  },
  {
    priceId: PLANS.educator_solo.monthlyPriceId,
    name: PLANS.educator_solo.name,
    amount: PLANS.educator_solo.monthlyAmount,
    cadence: "Per Month · Up To Five Pathways",
    blurb:
      "One educator with up to five independent student pathways, PPT prep, and goal tracking.",
  },
];


function statusTone(status: string): "default" | "secondary" | "destructive" {
  if (status === "active" || status === "trialing") return "default";
  if (status === "past_due" || status === "unpaid") return "destructive";
  return "secondary";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Personal billing for an individual subscriber (Family / Educator).
 * Organization billing lives in the operator console instead.
 */
export function PersonalBillingPanel() {
  const qc = useQueryClient();
  const configured = isPaymentsConfigured();
  const fetchBilling = useServerFn(getMyPersonalBilling);
  const openPortal = useServerFn(createPortalSession);
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);

  const fetchSponsorship = useServerFn(getMySponsorship);

  const sponsorship = useQuery({
    queryKey: ["my-sponsorship"],
    enabled: configured,
    queryFn: () =>
      fetchSponsorship({ data: { environment: getStripeEnvironment() } }),
  });

  const billing = useQuery({
    queryKey: ["personal-billing"],
    enabled: configured,
    queryFn: () =>
      fetchBilling({ data: { environment: getStripeEnvironment() } }),
  });

  const portal = useMutation({
    mutationFn: () =>
      openPortal({
        data: {
          returnUrl: window.location.href,
          environment: getStripeEnvironment(),
        },
      }),
    onSuccess: (res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!configured) return <PaymentTestModeBanner />;

  const sub = billing.data?.subscription ?? null;
  const plan = planForPriceId(sub?.price_id ?? null);

  return (
    <div className="space-y-4">
      <PaymentTestModeBanner />

      {sponsorship.data?.sponsored ? (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="space-y-2">
            <p>
              Your access is sponsored by{" "}
              <span className="font-medium">
                {sponsorship.data.organizationName ?? "your organization"}
              </span>
              . You keep this account and everything in it — there is nothing to
              pay while the sponsorship is active.
            </p>
            {sponsorship.data.duplicatePersonalSubscription && (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  You are also paying personally for the same coverage. Cancel
                  the personal renewal so you are not charged twice — your
                  access continues through the sponsorship.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={portal.isPending}
                  onClick={() => portal.mutate()}
                >
                  Cancel personal renewal
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {billing.data?.dunning ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>
            Your last payment did not go through. Your access stays on while we
            retry — update your card to avoid interruption.
          </p>
        </div>
      ) : null}


      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" aria-hidden />
              Your Plan
            </CardTitle>
            <CardDescription>
              Manage your subscription, payment method, and invoices.
            </CardDescription>
          </div>
          {sub ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              {portal.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              )}
              Manage Billing
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {billing.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your plan…</p>
          ) : sub ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{plan?.name ?? "Subscription"}</span>
                <Badge variant={statusTone(sub.status)}>
                  {subscriptionStatusLabel(sub.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {sub.cancel_at_period_end
                  ? `Cancels on ${formatDate(sub.current_period_end)} — you keep full access until then.`
                  : sub.status === "trialing"
                    ? `Free trial ends ${formatDate(sub.current_period_end)}, then billing begins.`
                    : `Renews on ${formatDate(sub.current_period_end)}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are on free access. Start a {TRIAL_PERIOD_DAYS}-day free
                trial — cancel any time before it ends and you are not charged.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PERSONAL_OPTIONS.map((option) => (
                  <div
                    key={option.priceId}
                    className="flex flex-col gap-2 rounded-lg border p-4"
                  >
                    <p className="font-medium">{option.name}</p>
                    <p className="text-2xl font-semibold">{option.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.cadence}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {option.blurb}
                    </p>
                    <Button
                      className="mt-auto"
                      size="sm"
                      onClick={() => setCheckoutPrice(option.priceId)}
                    >
                      Start Free Trial
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={checkoutPrice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCheckoutPrice(null);
            void qc.invalidateQueries({ queryKey: ["personal-billing"] });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
          </DialogHeader>
          {checkoutPrice ? (
            <StripeEmbeddedCheckout
              priceId={checkoutPrice}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
