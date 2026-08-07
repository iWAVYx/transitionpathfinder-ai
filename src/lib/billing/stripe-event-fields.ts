function stripeObjectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

/**
 * Stripe moved Invoice.subscription to
 * Invoice.parent.subscription_details.subscription in 2025-03-31.basil.
 * Accept both shapes so webhook processing remains compatible during API
 * version upgrades and endpoint secret rotations.
 */
export function subscriptionIdFromInvoice(invoice: unknown): string | null {
  if (!invoice || typeof invoice !== "object") return null;

  const row = invoice as {
    subscription?: unknown;
    parent?: {
      subscription_details?: {
        subscription?: unknown;
      } | null;
    } | null;
  };

  return (
    stripeObjectId(row.parent?.subscription_details?.subscription) ??
    stripeObjectId(row.subscription)
  );
}
