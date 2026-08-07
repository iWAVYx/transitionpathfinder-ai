/**
 * Stripe webhook — the single payment authority for access.
 *
 * Signature-verified against the raw body, idempotent (Stripe event ids are
 * stored with a unique constraint), and out-of-order tolerant (an event older
 * than the row it would overwrite is dropped). Confirmed billing state drives
 * three things: the `subscriptions` row, the org/user `license_pools` that
 * capacity is allocated from, and the legacy `access_entitlements` grants the
 * feature gates still read.
 *
 * Access is never granted from a client-side success redirect.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import {
  resolveServerStripeEnv,
  webhookEnvAllowed,
} from "@/lib/billing/stripe-env";
import { subscriptionIdFromInvoice } from "@/lib/billing/stripe-event-fields";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

/** `past_due` keeps access: Stripe is still retrying and the app duns. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const POOL_STATUS_ACTIVE = new Set(["active", "trialing", "past_due"]);

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function entitlementStatusFor(stripeStatus: string): string {
  if (stripeStatus === "trialing") return "trial";
  if (ACTIVE_STATUSES.has(stripeStatus)) return "active";
  return "canceled";
}

interface PlanRow {
  code: string;
  billing_scope: "individual" | "organization";
  is_addon: boolean;
  entitlement_plan_type: string | null;
}

interface CapacityRow {
  pathway_licenses: number;
  staff_seats: number;
  admin_seats: number;
}

/** Resolves the price lookup key to a catalog plan; unknown prices are loud. */
async function resolvePlan(
  priceId: string | null,
): Promise<{ plan: PlanRow; capacity: CapacityRow } | null> {
  if (!priceId) return null;
  const { data } = await getSupabase()
    .from("plans")
    .select(
      "code, billing_scope, is_addon, entitlement_plan_type, plan_capacities(pathway_licenses, staff_seats, admin_seats)",
    )
    .or(
      `monthly_price_id.eq.${priceId},yearly_price_id.eq.${priceId},one_time_price_id.eq.${priceId}`,
    )
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const capacityRel = (data as Record<string, unknown>)["plan_capacities"];
  const capacity = (Array.isArray(capacityRel) ? capacityRel[0] : capacityRel) as
    | CapacityRow
    | undefined;
  return {
    plan: data as unknown as PlanRow,
    capacity: capacity ?? { pathway_licenses: 0, staff_seats: 0, admin_seats: 0 },
  };
}

/** One Stripe Customer per paying subject; never shared org ↔ individual. */
async function upsertBillingAccount(
  subject: { user_id: string | null; organization_id: string | null },
  customerId: string | null,
  env: StripeEnv,
  collectionMethod: string,
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await getSupabase()
    .from("billing_accounts")
    .upsert(
      {
        ...subject,
        stripe_customer_id: customerId,
        environment: env,
        collection_method:
          collectionMethod === "send_invoice"
            ? "send_invoice"
            : "charge_automatically",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: subject.organization_id
          ? "organization_id,environment"
          : "user_id,environment",
      },
    )
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Mirrors purchased capacity into `license_pools`. Base plans replace their
 * own pool; add-on packs multiply the pack size by the purchased quantity.
 * Pools are suspended (not deleted) when billing lapses so the allocation
 * ledger and its audit trail survive.
 */
async function syncLicensePools(args: {
  subscriptionRowId: string;
  subject: { user_id: string | null; organization_id: string | null };
  plan: PlanRow;
  capacity: CapacityRow;
  quantity: number;
  status: string;
  periodEnd: string | null;
}) {
  const active = POOL_STATUS_ACTIVE.has(args.status);
  const multiplier = args.plan.is_addon ? Math.max(1, args.quantity) : 1;
  const source = args.plan.is_addon ? "addon" : "subscription";

  const rows = (
    [
      ["pathway", args.capacity.pathway_licenses],
      ["staff", args.capacity.staff_seats],
      ["admin", args.capacity.admin_seats],
    ] as const
  )
    .filter(([, included]) => included > 0)
    .map(([licenseType, included]) => ({
      ...args.subject,
      license_type: licenseType,
      source,
      plan_code: args.plan.code,
      subscription_id: args.subscriptionRowId,
      purchased: active ? included * multiplier : 0,
      status: active ? "active" : "expired",
      effective_to: active ? null : args.periodEnd,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await getSupabase()
    .from("license_pools")
    .upsert(rows, { onConflict: "subscription_id,license_type,source" });
  if (error) {
    console.error("Payment webhook: license pool sync failed:", error);
    throw new Error("License pool sync failed");
  }
}

/** Legacy boolean grants the existing feature gates still consult. */
async function reconcileEntitlement(args: {
  subject: { user_id: string | null; organization_id: string | null };
  plan: PlanRow;
  status: string;
  periodEnd: string | null;
  env: StripeEnv;
}) {
  const planType = args.plan.entitlement_plan_type;
  if (!planType) return;

  const org = args.subject.organization_id;
  const { error } = await getSupabase()
    .from("access_entitlements")
    .upsert(
      {
        ...args.subject,
        plan_type: planType,
        status: entitlementStatusFor(args.status),
        grants_family_access: args.plan.code !== "partner_premium",
        grants_student_access: args.plan.code !== "partner_premium",
        grants_partner_access: args.plan.code === "partner_premium",
        ends_at: args.periodEnd,
        source: `stripe:${args.env}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: org ? "organization_id,plan_type" : "user_id,plan_type" },
    );
  if (error) {
    console.error("Payment webhook: entitlement reconcile failed:", error);
    throw new Error("Entitlement reconcile failed");
  }
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key ??
    item?.price?.metadata?.lovable_external_id ??
    item?.price?.id ??
    null;
  const productId =
    typeof item?.price?.product === "string" ? item.price.product : null;
  const periodStart =
    item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const orgId = subscription.metadata?.organizationId ?? null;
  const userId = subscription.metadata?.userId ?? null;
  // Exactly one paying subject. Org billing wins when both are stamped so a
  // school never shares a billing account with the admin who bought it.
  const subject = orgId
    ? { organization_id: orgId as string, user_id: null }
    : { organization_id: null, user_id: (userId as string) ?? null };

  const resolved = await resolvePlan(priceId);
  if (!resolved) {
    console.error("Payment webhook: unmapped price:", priceId);
  }

  const billingAccountId = await upsertBillingAccount(
    subject,
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null),
    env,
    subscription.collection_method ?? "charge_automatically",
  );

  // Out-of-order guard: skip an event whose subscription snapshot predates
  // what we already stored.
  const eventStamp = isoFromUnix(
    subscription.items?.data?.[0]?.current_period_start ??
      subscription.current_period_start,
  );
  const { data: existing } = await getSupabase()
    .from("subscriptions")
    .select("id, current_period_start, status")
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .maybeSingle();
  if (
    existing?.current_period_start &&
    eventStamp &&
    new Date(eventStamp) < new Date(existing.current_period_start as string)
  ) {
    return;
  }

  const { data: row, error: subError } = await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        ...subject,
        stripe_subscription_id: subscription.id,
        stripe_customer_id:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id,
        billing_account_id: billingAccountId,
        plan_code: resolved?.plan.code ?? null,
        product_id: productId,
        price_id: priceId,
        status: subscription.status,
        quantity: item?.quantity ?? 1,
        current_period_start: isoFromUnix(periodStart),
        current_period_end: isoFromUnix(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select("id")
    .maybeSingle();

  // A throw returns non-200 so Stripe retries rather than leaving a paying
  // customer without access.
  if (subError || !row) {
    console.error("Payment webhook: subscription upsert failed:", subError);
    throw new Error("Subscription upsert failed");
  }

  if (!resolved) return;

  await syncLicensePools({
    subscriptionRowId: row.id as string,
    subject,
    plan: resolved.plan,
    capacity: resolved.capacity,
    quantity: item?.quantity ?? 1,
    status: subscription.status,
    periodEnd: isoFromUnix(periodEnd),
  });

  await reconcileEntitlement({
    subject,
    plan: resolved.plan,
    status: subscription.status,
    periodEnd: isoFromUnix(periodEnd),
    env,
  });
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await upsertSubscription({ ...subscription, status: "canceled" }, env);
}

/**
 * Invoice outcomes only adjust the dunning state; capacity and entitlements
 * follow the `customer.subscription.*` events Stripe sends alongside them.
 */
async function recordInvoiceOutcome(invoice: any, env: StripeEnv, paid: boolean) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) {
    throw new Error("Invoice event is missing its subscription reference");
  }

  await getSupabase()
    .from("subscriptions")
    .update({
      last_invoice_status: paid ? "paid" : "payment_failed",
      last_invoice_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  // Idempotency: a repeated event id is a no-op.
  if (event.id) {
    const { error } = await getSupabase()
      .from("processed_payment_events")
      .insert({ event_id: event.id, event_type: event.type, environment: env });
    if (error?.code === "23505") return; // duplicate delivery
    if (error) {
      throw new Error("Could not claim payment event for idempotent processing");
    }
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await upsertSubscription(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await markCanceled(event.data.object, env);
        break;
      case "invoice.paid":
        await recordInvoiceOutcome(event.data.object, env, true);
        break;
      case "invoice.payment_failed":
        await recordInvoiceOutcome(event.data.object, env, false);
        break;
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
        // Access follows customer.subscription.* / invoice.paid only.
        break;
      default:
        console.log("Unhandled payment event:", event.type);
    }
  } catch (err) {
    // Release the idempotency claim so Stripe's retry can reprocess.
    if (event.id) {
      await getSupabase()
        .from("processed_payment_events")
        .delete()
        .eq("event_id", event.id)
        .eq("environment", env);
    }
    throw err;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");

        // The deployment owns the environment: staging processes sandbox
        // events only, production live events only. Mismatches are rejected
        // before signature verification or any database access.
        let serverEnv: StripeEnv;
        try {
          serverEnv = resolveServerStripeEnv();
        } catch {
          console.error("Payment webhook: deployment environment unresolved");
          return new Response("Environment not configured", { status: 400 });
        }
        if (!webhookEnvAllowed(rawEnv, serverEnv)) {
          console.error("Payment webhook: env mismatch for this deployment");
          return new Response("Environment mismatch", { status: 400 });
        }
        try {
          await handleWebhook(request, serverEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Payment webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
