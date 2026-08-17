import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Platform-admin triage helpers for the waitlist.
 *
 * - updateWaitlistTriage: set status, routing_category, and/or assign to an
 *   admin. Used by the Owner Hub.
 * - linkConvertedAccount: stamp converted_to_user_id and flip status to
 *   'converted' once a waitlist entry becomes an active account (typically
 *   called from the invitation-accept flow once we wire it).
 *
 * RLS already restricts UPDATE on public.waitlist to platform admins, but
 * we double-check via is_platform_admin so non-admin callers get a clear
 * error instead of a row-not-found.
 */

const STATUSES = [
  "new",
  "needs_review",
  "routed_family_early_access",
  "routed_educator_demo",
  "routed_school_pilot",
  "routed_district_pilot",
  "routed_partner_review",
  "invited",
  "converted",
  "not_eligible_yet",
  "archived",
] as const;

const ROUTING_CATEGORIES = [
  "family_early_access",
  "educator_demo",
  "school_pilot",
  "district_pilot",
  "partner_review",
  "future_updates",
  "needs_review",
] as const;

async function assertPlatformAdmin(supabase: any, userId: string) {
  const { data: isAdmin, error } = await supabase.rpc("is_platform_admin", {
    _user_id: userId,
  });
  if (error || !isAdmin) throw new Error("Not authorized.");
}

export const updateWaitlistTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        waitlist_id: z.string().uuid(),
        status: z.enum(STATUSES).optional(),
        routing_category: z.enum(ROUTING_CATEGORIES).optional(),
        assigned_admin_id: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.routing_category !== undefined) patch.routing_category = data.routing_category;
    if (data.assigned_admin_id !== undefined) patch.assigned_admin_id = data.assigned_admin_id;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("waitlist")
      .update(patch as never)
      .eq("id", data.waitlist_id);
    if (error) {
      console.error("updateWaitlistTriage failed", error);
      throw new Error("Could not update waitlist entry.");
    }
    return { ok: true };
  });

export const linkConvertedAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        waitlist_id: z.string().uuid(),
        user_id: z.string().uuid(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const { error } = await context.supabase
      .from("waitlist")
      .update({
        converted_to_user_id: data.user_id,
        status: "converted",
      } as never)
      .eq("id", data.waitlist_id);
    if (error) {
      console.error("linkConvertedAccount failed", error);
      throw new Error("Could not link account to waitlist entry.");
    }
    return { ok: true };
  });
