/**
 * Phase 4 — Billing & Licensing server functions.
 *
 * Billing attaches to organizations (never to user roles). An org admin
 * starts checkout for their org; Stripe is the payment authority and the
 * webhook-confirmed subscription row is what grants access.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import type Stripe from "stripe";
import { resolveOrCreateCustomer } from "@/lib/billing/billing.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };


/**
 * Creates an embedded checkout session for a plan. When `organizationId`
 * is provided the caller must be an admin of that org — the resulting
 * subscription is stamped with the org so entitlements land there.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      priceId: string;
      quantity?: number;
      organizationId?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) {
        throw new Error("Invalid priceId");
      }

      if (data.quantity != null && (data.quantity < 1 || data.quantity > 1000)) {
        throw new Error("Invalid quantity");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;

    if (data.organizationId) {
      const { data: isAdmin, error } = await supabase.rpc("is_org_admin", {
        _user_id: userId,
        _org_id: data.organizationId,
      });
      if (error || !isAdmin) {
        return { error: "You do not manage billing for this organization." };
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "Plan not found" };
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId,
      });

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId =
          typeof stripePrice.product === "string"
            ? stripePrice.product
            : stripePrice.product.id;
        const product = await stripe.products.retrieve(productId);
        productDescription = (product as Stripe.Product).name;
      }

      const metadata: Record<string, string> = { userId };
      if (data.organizationId) metadata["organizationId"] = data.organizationId;
      metadata["managed_payments"] = "true";

      // `managed_payments` is a preview-API field not yet in the SDK types.
      const sessionParams = {
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata,
        managed_payments: { enabled: true },
        ...(isRecurring
          ? { subscription_data: { metadata } }
          : { payment_intent_data: { description: productDescription } }),
      } as unknown as Stripe.Checkout.SessionCreateParams;

      const session = await stripe.checkout.sessions.create(sessionParams);


      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Opens the Stripe-hosted billing portal for the caller's active customer. */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      returnUrl?: string;
      organizationId?: string;
      environment: StripeEnv;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { supabase, userId } = context;

    let query = supabase
      .from("subscriptions")
      .select("stripe_customer_id, organization_id")
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1);

    query = data.organizationId
      ? query.eq("organization_id", data.organizationId)
      : query.eq("user_id", userId);

    const { data: sub, error } = await query.maybeSingle();
    if (error || !sub?.stripe_customer_id) {
      return { error: "No billing account found yet." };
    }

    if (data.organizationId) {
      const { data: isAdmin } = await supabase.rpc("is_org_admin", {
        _user_id: userId,
        _org_id: data.organizationId,
      });
      if (!isAdmin) {
        return { error: "You do not manage billing for this organization." };
      }
    }

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl ? { return_url: data.returnUrl } : {}),
      });
      return { url: portal.url };
    } catch (err) {
      return { error: getStripeErrorMessage(err) };
    }
  });

export interface BillingSummaryRow {
  id: string;
  status: string;
  price_id: string | null;
  quantity: number;
  organization_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/** Subscriptions visible to the caller (own + orgs they belong to). */
export const getMyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<BillingSummaryRow[]> => {
    const { data: rows } = await context.supabase
      .from("subscriptions")
      .select(
        "id, status, price_id, quantity, organization_id, current_period_end, cancel_at_period_end",
      )
      .eq("environment", data.environment)
      .order("created_at", { ascending: false });
    return (rows ?? []) as BillingSummaryRow[];
  });
