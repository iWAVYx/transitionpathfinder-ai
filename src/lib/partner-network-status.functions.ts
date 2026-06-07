import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PartnerNetworkStatus = {
  metrics: {
    totalPartners: number;
    totalOpportunities: number;
    verifiedPartners: number;
    potentialPartners: number;
    needsReview: number;
    outreachNeeded: number;
    partnerSubmissions: number;
    featuredPartners: number;
    connecticutResources: number;
    savedOpportunities: number;
    lastReviewedAt: string | null;
    nextReviewDueAt: string | null;
  };
};

export const getPartnerNetworkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const count = (q: { count: number | null }) => q.count ?? 0;

    const [
      total,
      verified,
      potential,
      review,
      outreach,
      featured,
      ct,
      opps,
      subs,
      saved,
      lastReviewed,
      nextReview,
    ] = await Promise.all([
      supabase.from("partner_organizations").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified"),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("partnership_status", "potential"),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "needs_review"),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .in("outreach_status", ["not_contacted", "needs_follow_up"]),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("is_featured", true),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("state", "CT"),
      supabase.from("partner_network_opportunities").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase.from("student_saved_partners").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_organizations")
        .select("last_reviewed_at")
        .not("last_reviewed_at", "is", null)
        .order("last_reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("partner_organizations")
        .select("next_review_due_at")
        .not("next_review_due_at", "is", null)
        .order("next_review_due_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      metrics: {
        totalPartners: count(total),
        totalOpportunities: count(opps),
        verifiedPartners: count(verified),
        potentialPartners: count(potential),
        needsReview: count(review),
        outreachNeeded: count(outreach),
        partnerSubmissions: count(subs),
        featuredPartners: count(featured),
        connecticutResources: count(ct),
        savedOpportunities: count(saved),
        lastReviewedAt:
          (lastReviewed.data as { last_reviewed_at: string | null } | null)?.last_reviewed_at ??
          null,
        nextReviewDueAt:
          (nextReview.data as { next_review_due_at: string | null } | null)?.next_review_due_at ??
          null,
      },
    } satisfies PartnerNetworkStatus;
  });
