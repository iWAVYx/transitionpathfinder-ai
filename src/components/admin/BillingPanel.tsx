import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Minus,
  Plus,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentTestModeBanner } from "@/components/billing/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/billing/StripeEmbeddedCheckout";
import { Input } from "@/components/ui/input";
import {
  createPortalSession,
  getMyBilling,
  requestDistrictInvoice,
  updateSubscriptionSeats,
  type BillingSummaryRow,
} from "@/lib/billing/billing.functions";
import {
  MAX_SEATS,
  PLANS as CATALOG,
  isSeatBasedPrice,
  normalizeOrganizationKind,
  organizationPlanKeysForType,
} from "@/lib/billing/plans";

import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

/**
 * Seat control for a seat-based (School Plan) subscription. Changing the
 * count updates Stripe with prorations; the webhook then confirms the row.
 */
function SeatEditor({ orgId, row }: { orgId: string; row: BillingSummaryRow }) {
  const qc = useQueryClient();
  const updateSeats = useServerFn(updateSubscriptionSeats);
  const [seats, setSeats] = useState<number>(row.quantity || 1);

  const save = useMutation({
    mutationFn: () =>
      updateSeats({
        data: {
          organizationId: orgId,
          subscriptionId: row.id,
          quantity: seats,
          environment: getStripeEnvironment(),
        },
      }),
    onSuccess: (res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Capacity updated to ${res.quantity} packs.`);
      qc.invalidateQueries({ queryKey: ["billing", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clamp = (n: number) => Math.min(MAX_SEATS, Math.max(1, n));
  const dirty = seats !== row.quantity;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Packs</span>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="Decrease packs"
          disabled={save.isPending || seats <= 1}
          onClick={() => setSeats((s) => clamp(s - 1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Input
          className="h-8 w-16 text-center"
          inputMode="numeric"
          aria-label="Pack count"
          value={seats}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            setSeats(Number.isNaN(n) ? 1 : clamp(n));
          }}
        />
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="Increase packs"
          disabled={save.isPending || seats >= MAX_SEATS}
          onClick={() => setSeats((s) => clamp(s + 1))}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button
        size="sm"
        variant={dirty ? "default" : "outline"}
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Update packs
      </Button>
      {dirty && (
        <span className="text-xs text-muted-foreground">
          Billed with prorations on the current period.
        </span>
      )}
    </div>
  );
}


interface PlanOption {
  priceId: string;
  name: string;
  cadence: string;
  amount: string;
  blurb: string;
}

/**
 * Organization-purchasable catalog, derived from the shared plan definitions
 * so console pricing can never drift from the Stripe lookup keys.
 */
function planOptionsForOrganization(orgType: string): PlanOption[] {
  return organizationPlanKeysForType(orgType).flatMap((key) => {
    const plan = CATALOG[key];
    const priceId = plan.yearlyPriceId ?? plan.oneTimePriceId ?? plan.monthlyPriceId;
    if (!priceId) return [];
    return [
      {
        priceId,
        name: plan.name,
        cadence: plan.oneTimePriceId
          ? `One Time · ${plan.termMonths} Months`
          : plan.yearlyPriceId
            ? "Per Year"
            : "Per Month",
        amount: plan.yearlyAmount ?? plan.monthlyAmount ?? "",
        blurb: plan.blurb,
      },
    ];
  });
}


/**
 * Districts rarely pay by card. This raises a Stripe invoice against the
 * organization's own customer with net terms; access still waits for the
 * `invoice.paid` webhook, so an unpaid PO grants nothing.
 */
function InvoiceRequestCard({
  orgId,
  plans,
}: {
  orgId: string;
  plans: PlanOption[];
}) {
  const requestInvoice = useServerFn(requestDistrictInvoice);
  const [priceId, setPriceId] = useState(plans[0]?.priceId ?? "");
  const [poRef, setPoRef] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setPriceId(plans[0]?.priceId ?? "");
  }, [plans]);

  const send = useMutation({
    mutationFn: () =>
      requestInvoice({
        data: {
          organizationId: orgId,
          priceId,
          purchaseOrderRef: poRef || undefined,
          billingEmail: email || undefined,
          environment: getStripeEnvironment(),
        },
      }),
    onSuccess: (res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Invoice sent. Access activates once payment clears.");
      if (res.invoiceUrl) window.open(res.invoiceUrl, "_blank", "noopener,noreferrer");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pay by Invoice or Purchase Order</CardTitle>
        <CardDescription>
          For districts on net-30 terms. We email an invoice payable by ACH or
          check; licenses activate after the payment clears.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Plan to invoice"
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.priceId} value={p.priceId}>
              {p.name} — {p.amount} {p.cadence}
            </option>
          ))}
        </select>
        <Input
          className="h-9"
          placeholder="Billing email"
          aria-label="Billing email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          className="h-9"
          placeholder="Purchase order reference (optional)"
          aria-label="Purchase order reference"
          value={poRef}
          onChange={(e) => setPoRef(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={send.isPending || !priceId}
          onClick={() => send.mutate()}
        >
          {send.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          <FileText className="mr-1.5 h-3.5 w-3.5" /> Send Invoice
        </Button>
      </CardContent>
    </Card>
  );
}


function statusTone(status: string): "default" | "secondary" | "destructive" {
  if (status === "active" || status === "trialing") return "default";
  if (status === "past_due" || status === "unpaid") return "destructive";
  return "secondary";
}

/**
 * Org-scoped billing. Billing attaches to the organization, never to a
 * user role — only org admins reach this panel (the console already gates
 * on is_org_admin) and Stripe's webhook-confirmed state controls access.
 */
export function BillingPanel({
  orgId,
  orgType,
}: {
  orgId: string;
  orgType: string;
}) {
  const qc = useQueryClient();
  const configured = isPaymentsConfigured();
  const fetchBilling = useServerFn(getMyBilling);
  const openPortal = useServerFn(createPortalSession);
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);
  const plans = useMemo(() => planOptionsForOrganization(orgType), [orgType]);

  const billing = useQuery({
    queryKey: ["billing", orgId],
    enabled: configured,
    queryFn: () => fetchBilling({ data: { environment: getStripeEnvironment() } }),
  });

  const portal = useMutation({
    mutationFn: () =>
      openPortal({
        data: {
          organizationId: orgId,
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

  if (!configured) {
    return <PaymentTestModeBanner />;
  }

  const rows: BillingSummaryRow[] = (billing.data ?? []).filter(
    (r) => r.organization_id === orgId,
  );

  return (
    <div className="space-y-4">
      <PaymentTestModeBanner />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Current Subscription</CardTitle>
            <CardDescription>
              Billing belongs to this organization. Seats and access follow the
              confirmed payment state.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={portal.isPending || rows.length === 0}
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            )}
            Manage billing
          </Button>
        </CardHeader>
        <CardContent>
          {billing.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading billing…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subscription yet for this organization. Choose a plan below to
              start checkout.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="space-y-2 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.price_id ?? "Plan"}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Badge variant={statusTone(r.status)}>{r.status}</Badge>
                      {r.quantity > 1 && <span>{r.quantity} seats</span>}
                      {r.current_period_end && (
                        <span>
                          {r.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                          {new Date(r.current_period_end).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </div>
                  {isSeatBasedPrice(r.price_id) && (
                    <SeatEditor orgId={orgId} row={r} />
                  )}
                </li>
              ))}
            </ul>
          )}

        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.priceId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{plan.name}</CardTitle>
              <CardDescription>
                <span className="font-display text-xl text-foreground">
                  {plan.amount}
                </span>{" "}
                · {plan.cadence}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{plan.blurb}</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => setCheckoutPrice(plan.priceId)}
              >
                <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Start checkout
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {normalizeOrganizationKind(orgType) === "district" ? (
        <InvoiceRequestCard
          orgId={orgId}
          plans={plans.filter((option) => {
            const plan = Object.values(CATALOG).find(
              (candidate) =>
                candidate.yearlyPriceId === option.priceId ||
                candidate.oneTimePriceId === option.priceId ||
                candidate.monthlyPriceId === option.priceId,
            );
            return plan?.orgKind === "district" && !plan.isAddon;
          })}
        />
      ) : null}


      <Dialog
        open={checkoutPrice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCheckoutPrice(null);
            qc.invalidateQueries({ queryKey: ["billing", orgId] });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          {checkoutPrice && (
            <StripeEmbeddedCheckout
              priceId={checkoutPrice}
              organizationId={orgId}
              returnUrl={`${window.location.origin}/admin/orgs?checkout=complete`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
