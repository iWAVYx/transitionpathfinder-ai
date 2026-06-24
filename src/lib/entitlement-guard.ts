/**
 * Server-side entitlement guard for write endpoints.
 *
 * Usage (inside a server-fn handler that uses requireSupabaseAuth):
 *
 *   await requireFeatureEntitlement(context.supabase, context.userId, "family");
 *
 * Behavior:
 *   - Platform admins always pass.
 *   - Calls the `user_has_feature` Postgres function to check
 *     `effective_entitlement_for_user` (which already covers
 *     district-inherited access for member schools/families).
 *   - **Warn-only by default.** When the user lacks the feature, the call
 *     logs but does NOT throw — this avoids breaking existing pilot users
 *     who have no entitlement row yet.
 *   - When `process.env.TF_ENFORCE_ENTITLEMENTS === "1"`, the call throws an
 *     `EntitlementRequiredError`. Flip the env var on for market release.
 *
 * The point of this slice is to plant the enforcement point on every paid
 * write path; the flip from warn → throw is a single env-var change with no
 * code edit required.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type EntitlementFeature = "family" | "student" | "partner" | "any";

const FEATURE_MAP: Record<EntitlementFeature, string> = {
  family: "family_access",
  student: "student_access",
  partner: "partner_access",
  any: "any",
};

export class EntitlementRequiredError extends Error {
  readonly code = "ENTITLEMENT_REQUIRED" as const;
  readonly feature: EntitlementFeature;
  constructor(feature: EntitlementFeature, message?: string) {
    super(
      message ??
        "Your organization does not have an active TransitionForward subscription for this feature. Contact your district or family admin to enable access.",
    );
    this.name = "EntitlementRequiredError";
    this.feature = feature;
  }
}

export async function requireFeatureEntitlement(
  // The auth-middleware client is typed as SupabaseClient<Database>; .rpc
  // signatures vary across versions so we keep the args loose.
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: EntitlementFeature,
): Promise<{ enforced: boolean; allowed: boolean }> {
  // Platform-admin bypass — admins manage entitlements themselves.
  try {
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    } as never);
    if (isAdmin === true) return { enforced: false, allowed: true };
  } catch (err) {
    console.warn("[entitlement] has_role check failed; continuing", err);
  }

  let allowed = true;
  try {
    const { data, error } = await supabase.rpc("user_has_feature", {
      _user_id: userId,
      _feature: FEATURE_MAP[feature],
    } as never);
    if (error) {
      console.warn("[entitlement] user_has_feature failed; allowing by default", error);
      return { enforced: false, allowed: true };
    }
    allowed = data === true;
  } catch (err) {
    console.warn("[entitlement] user_has_feature threw; allowing by default", err);
    return { enforced: false, allowed: true };
  }

  const enforce = process.env.TF_ENFORCE_ENTITLEMENTS === "1";

  if (!allowed) {
    if (enforce) {
      console.info(
        `[entitlement] BLOCK user=${userId} feature=${feature} (enforcement ON)`,
      );
      throw new EntitlementRequiredError(feature);
    }
    console.info(
      `[entitlement] would-block user=${userId} feature=${feature} (enforcement OFF — set TF_ENFORCE_ENTITLEMENTS=1 to enforce)`,
    );
    return { enforced: false, allowed: true };
  }

  return { enforced: enforce, allowed: true };
}
