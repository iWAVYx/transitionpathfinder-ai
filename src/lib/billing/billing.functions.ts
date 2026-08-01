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
import {
  MAX_SEATS,
  TRIAL_PERIOD_DAYS,
  isSeatBasedPrice,
} from "@/lib/billing/plans";

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
          ? {
              subscription_data: {
                metadata,
                // 30-day free trial; the card is collected up front and the
                // first charge lands when the trial ends.
                trial_period_days: TRIAL_PERIOD_DAYS,
              },
            }
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
  stripe_subscription_id: string;
}

type SeatUpdateResult =
  | { quantity: number }
  | { error: string };

/**
 * Changes the seat count on an org's seat-based subscription. Only org
 * admins may call it, and seats can never drop below the number of active
 * members already occupying them.
 */
export const updateSubscriptionSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      organizationId: string;
      subscriptionId: string;
      quantity: number;
      environment: StripeEnv;
    }) => {
      if (!Number.isInteger(data.quantity)) throw new Error("Invalid quantity");
      if (data.quantity < 1 || data.quantity > MAX_SEATS) {
        throw new Error(`Seats must be between 1 and ${MAX_SEATS}`);
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<SeatUpdateResult> => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: adminError } = await supabase.rpc(
      "is_org_admin",
      { _user_id: userId, _org_id: data.organizationId },
    );
    if (adminError || !isAdmin) {
      return { error: "You do not manage billing for this organization." };
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, price_id, quantity, status")
      .eq("id", data.subscriptionId)
      .eq("organization_id", data.organizationId)
      .eq("environment", data.environment)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return { error: "No subscription found for this organization." };
    }
    if (!isSeatBasedPrice(sub.price_id)) {
      return { error: "This plan is not billed by the seat." };
    }

    const { count } = await supabase
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", data.organizationId)
      .eq("membership_status", "active");

    const used = count ?? 0;
    if (data.quantity < used) {
      return {
        error: `${used} members are active. Remove members before lowering seats to ${data.quantity}.`,
      };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const subscription = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id,
      );
      const item = subscription.items.data[0];
      if (!item) return { error: "Subscription has no billable item." };

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: item.id, quantity: data.quantity }],
        proration_behavior: "create_prorations",
      });

      // Optimistic local write; the webhook remains the source of truth.
      await supabase
        .from("subscriptions")
        .update({ quantity: data.quantity })
        .eq("id", data.subscriptionId);

      return { quantity: data.quantity };
    } catch (err) {
      return { error: getStripeErrorMessage(err) };
    }
  });


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

export interface PersonalBillingSummary {
  /** The caller's own (non-organization) subscription, if any. */
  subscription: BillingSummaryRow | null;
  /** The webhook-confirmed personal entitlement backing that subscription. */
  entitlement: {
    plan_type: string;
    status: string;
    ends_at: string | null;
  } | null;
  /** True while Stripe is retrying a failed renewal charge. */
  dunning: boolean;
}

/**
 * Personal (non-org) billing state for the signed-in user. Drives the
 * Settings → Billing tab and in-app upgrade prompts.
 */
export const getMyPersonalBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PersonalBillingSummary> => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select(
        "id, status, price_id, quantity, organization_id, current_period_end, cancel_at_period_end",
      )
      .eq("environment", data.environment)
      .eq("user_id", userId)
      .is("organization_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: ent } = await supabase
      .from("access_entitlements")
      .select("plan_type, status, ends_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const row = (sub ?? null) as BillingSummaryRow | null;
    return {
      subscription: row,
      entitlement: ent ?? null,
      dunning: row?.status === "past_due" || row?.status === "unpaid",
    };
  });

/**
 * Reads a completed checkout session so the return page can confirm the
 * purchase without waiting on webhook propagation.
 */
export const getCheckoutSessionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^cs_[a-zA-Z0-9_]+$/.test(data.sessionId)) {
      throw new Error("Invalid session id");
    }
    return data;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<
      { status: string; paymentStatus: string; planName: string | null } | { error: string }
    > => {
      try {
        const stripe = createStripeClient(data.environment);
        const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
          expand: ["line_items"],
        });
        // Only the buyer may read their own session.
        if (session.metadata?.["userId"] !== context.userId) {
          return { error: "This checkout does not belong to your account." };
        }
        return {
          status: session.status ?? "unknown",
          paymentStatus: session.payment_status ?? "unknown",
          planName: session.line_items?.data?.[0]?.description ?? null,
        };
      } catch (err) {
        return { error: getStripeErrorMessage(err) };
      }
    },
  );

