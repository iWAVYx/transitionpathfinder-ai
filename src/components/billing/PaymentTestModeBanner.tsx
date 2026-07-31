import { isPaymentsConfigured } from "@/lib/stripe";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as
  | string
  | undefined;

/**
 * Shown above billing surfaces. Renders nothing once live payments are
 * configured; warns loudly if a build shipped without payment credentials.
 */
export function PaymentTestModeBanner() {
  if (!isPaymentsConfigured()) {
    return (
      <div className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Production checkout is not configured yet. Complete payment go-live to
        accept real payments.
      </div>
    );
  }
  if (clientToken?.startsWith("pk_test_")) {
    return (
      <div className="w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-300">
        Payments are in test mode — no real money moves. Use card 4242 4242 4242
        4242 to try checkout.
      </div>
    );
  }
  return null;
}
