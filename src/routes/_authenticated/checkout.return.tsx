import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { getCheckoutSessionStatus } from "@/lib/billing/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/checkout/return")({
  head: () => ({
    meta: [
      { title: "Checkout Complete — TransitionForward" },
      {
        name: "description",
        content:
          "Confirmation for your TransitionForward subscription, including trial dates and next steps.",
      },
      { property: "og:title", content: "Checkout Complete — TransitionForward" },
      {
        property: "og:description",
        content: "Your TransitionForward subscription confirmation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id:
      typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  component: CheckoutReturnPage,
});

type State =
  | { kind: "loading" }
  | { kind: "complete"; planName: string | null }
  | { kind: "pending" }
  | { kind: "error"; message: string };

function CheckoutReturnPage() {
  const { session_id: sessionId } = Route.useSearch();
  const readSession = useServerFn(getCheckoutSessionStatus);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!sessionId) {
      setState({ kind: "error", message: "No checkout session was provided." });
      return;
    }
    let cancelled = false;
    readSession({ data: { sessionId, environment: getStripeEnvironment() } })
      .then((res) => {
        if (cancelled) return;
        if ("error" in res) {
          setState({ kind: "error", message: res.error });
          return;
        }
        if (res.status === "complete" && res.paymentStatus !== "unpaid") {
          setState({ kind: "complete", planName: res.planName });
        } else {
          // Delayed payment methods settle later; access opens on settlement.
          setState({ kind: "pending" });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "We could not confirm this checkout. Please check Settings → Billing.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [readSession, sessionId]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        {state.kind === "loading" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
            <h1 className="mt-6 font-display text-2xl">Confirming Your Subscription…</h1>
          </>
        ) : state.kind === "complete" ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
            <h1 className="mt-6 font-display text-3xl">You're All Set</h1>
            <p className="mt-3 text-muted-foreground">
              {state.planName
                ? `Your ${state.planName} subscription is active.`
                : "Your subscription is active."}{" "}
              Your free trial started today — you can cancel any time before it
              ends from Settings → Billing.
            </p>
          </>
        ) : state.kind === "pending" ? (
          <>
            <Clock className="mx-auto h-10 w-10 text-primary" aria-hidden />
            <h1 className="mt-6 font-display text-3xl">Payment Processing</h1>
            <p className="mt-3 text-muted-foreground">
              Your bank is still confirming this payment. We'll unlock your plan
              automatically as soon as it clears — no action needed.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
            <h1 className="mt-6 font-display text-3xl">We Hit a Snag</h1>
            <p className="mt-3 text-muted-foreground">{state.message}</p>
          </>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings" hash="billing">
              View Billing
            </Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
