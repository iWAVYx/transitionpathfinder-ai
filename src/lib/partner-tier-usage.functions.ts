// Partner Network — tier usage snapshot (Workstream C).
// Returns published-opportunity count, cap, and tier capabilities for a
// partner org so the workspace can render a usage meter and gate CTAs.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FREE_TIER_OPPORTUNITY_CAP,
  derivePartnerTier,
  opportunityCapFor,
  type PartnerTier,
} from "./partner-tier-config";

export type PartnerTierCapabilities = {
  publish_opportunity: boolean;
  publish_unlimited_opportunities: boolean;
  view_analytics: boolean;
  featured_placement: boolean;
};

export type PartnerTierUsage = {
  organization_id: string;
  tier: PartnerTier;
  cap: number | null; // null = unlimited
  publishedCount: number;
  atCap: boolean;
  capabilities: PartnerTierCapabilities;
};

const CAPABILITIES: Array<keyof PartnerTierCapabilities> = [
  "publish_opportunity",
  "publish_unlimited_opportunities",
  "view_analytics",
  "featured_placement",
];

export const getPartnerTierUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ organization_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<PartnerTierUsage> => {
    const { supabase, userId } = context;

    // Confirm caller is an active member of this org (RLS is the real gate,
    // but the readable error beats a generic RPC failure).
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("organization_id", data.organization_id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) {
      throw new Error("You are not an active member of this partner organization.");
    }

    // Resolve capabilities via the DB-side `partner_tier_allows` RPC — one
    // round-trip per capability, all evaluated as the calling user.
    const capabilities = {} as PartnerTierCapabilities;
    for (const cap of CAPABILITIES) {
      const { data: allowed } = await supabase.rpc("partner_tier_allows", {
        _user_id: userId,
        _capability: cap,
      });
      capabilities[cap] = Boolean(allowed);
    }

    const tier = derivePartnerTier(capabilities);
    const cap = opportunityCapFor(tier);

    // Published-opportunity count against the ceiling. "Published" =
    // approved OR pending_review (both consume a slot on the free tier).
    const { count } = await supabase
      .from("partner_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", data.organization_id)
      .in("status", ["approved", "pending_review"]);
    const publishedCount = count ?? 0;

    return {
      organization_id: data.organization_id,
      tier,
      cap,
      publishedCount,
      atCap: cap !== null && publishedCount >= cap,
      capabilities,
    };
  });

// Re-export for convenience in UI imports.
export { FREE_TIER_OPPORTUNITY_CAP };
