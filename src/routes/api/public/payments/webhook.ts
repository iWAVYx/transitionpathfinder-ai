/**
 * Stripe webhook — the payment authority for access. Signature-verified,
 * idempotent (processed event ids are stored), and org-aware: a subscription
 * carrying `organizationId` metadata also reconciles `access_entitlements`
 * so seats/entitlements follow the confirmed billing state.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

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

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function planTypeFor(priceId: string | null): string {
  if (!priceId) return "standard";
  if (priceId.startsWith("tf_partner_premium")) return "partner_premium";
  if (priceId.startsWith("tf_school")) return "school";
  if (priceId.startsWith("tf_educator")) return "educator";
  if (priceId.startsWith("tf_family")) return "family";
  return "standard";
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function reconcileEntitlement(
  subscription: any,
  priceId: string | null,
  env: StripeEnv,
) {
  const orgId = subscription.metadata?.organizationId;
  if (!orgId) return;

  const planType = planTypeFor(priceId);
  const active = ACTIVE_STATUSES.has(subscription.status);
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("access_entitlements")
    .upsert(
      {
        organization_id: orgId,
        plan_type: planType,
        status: active ? "active" : "canceled",
        grants_family_access: planType === "family" || planType === "school",
        grants_student_access: planType === "family" || planType === "school",
        grants_partner_access: planType === "partner_premium",
        ends_at: isoFromUnix(periodEnd),
        source: `stripe:${env}`,
      },
      { onConflict: "organization_id,plan_type" },
    );
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

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: subscription.metadata?.userId ?? null,
        organization_id: subscription.metadata?.organizationId ?? null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id,
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
    );

  await reconcileEntitlement(subscription, priceId, env);
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  await reconcileEntitlement(
    { ...subscription, status: "canceled" },
    subscription.items?.data?.[0]?.price?.lookup_key ?? null,
    env,
  );
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  // Idempotency + out-of-order safety: a repeated event id is a no-op.
  if (event.id) {
    const { error } = await getSupabase()
      .from("processed_payment_events")
      .insert({ event_id: event.id, event_type: event.type, environment: env });
    if (error) return; // duplicate delivery
  }

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
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "invoice.paid":
    case "invoice.payment_failed":
      // Subscription state is driven by customer.subscription.* events.
      break;
    default:
      console.log("Unhandled payment event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Payment webhook: invalid env parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Payment webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
