import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Heuristic matching engine: scores published partner organizations against
 * a single student's profile. Pure read; does not persist matches.
 *
 * Score factors:
 *  - pathway category overlap (interests/goals → pathway_categories)
 *  - audience served (age band, transition status)
 *  - county proximity (student location → partner.county)
 *  - keyword hits in description/services against interests + support needs
 *  - verified > potential > needs_review (small tiebreaker boost)
 */
export type PartnerMatch = {
  partner_id: string;
  organization_name: string;
  partner_type: string;
  description: string | null;
  website_url: string | null;
  verification_status: string;
  county: string | null;
  is_featured: boolean;
  pathway_categories: string[];
  score: number;
  reasons: string[];
  suggested_next_step: string;
};

function tokens(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

export const matchPartnersForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string; limit?: number }) => d)
  .handler(async ({ data, context }): Promise<{ matches: PartnerMatch[] }> => {
    const { data: studentRaw, error: e1 } = await context.supabase
      .from("students")
      .select(
        "id, age, grade_band, interests_summary, strengths_summary, support_needs_summary, family_priorities, primary_disability_category, current_transition_status, readiness_level",
      )
      .eq("id", data.student_id)
      .single();
    if (e1 || !studentRaw) throw e1 ?? new Error("Student not found");
    const student = studentRaw as {
      age: number | null;
      grade_band: string | null;
      interests_summary: string | null;
      strengths_summary: string | null;
      support_needs_summary: string | null;
      family_priorities: string | null;
      primary_disability_category: string | null;
      current_transition_status: string | null;
      readiness_level: string | null;
    };

    const { data: partners, error: e2 } = await context.supabase
      .from("partner_organizations")
      .select(
        "id, organization_name, partner_type, description, website_url, verification_status, county, is_featured, pathway_categories, audience_served, age_range, disability_focus, services_offered, opportunity_types",
      )
      .eq("is_public", true);
    if (e2) throw e2;

    const interestTokens = new Set([
      ...tokens(student.interests_summary),
      ...tokens(student.strengths_summary),
      ...tokens(student.family_priorities),
    ]);
    const needTokens = new Set(tokens(student.support_needs_summary));
    const status = (student.current_transition_status ?? "").toLowerCase();

    // Infer pathway interests from text + transition status
    const pathwayHints = new Set<string>();
    const hint = (k: string, words: string[]) => {
      if (words.some((w) => interestTokens.has(w))) pathwayHints.add(k);
    };
    hint("employment", ["job", "work", "career", "employment", "paycheck", "internship"]);
    hint("college", ["college", "university", "academic", "study"]);
    hint("technical_training", ["trade", "technical", "vocational", "welding", "automotive", "culinary", "hvac", "construction"]);
    hint("independent_living", ["independent", "living", "apartment", "cooking", "transportation"]);
    hint("day_program", ["community", "social", "activities"]);
    if (status.includes("employment")) pathwayHints.add("employment");
    if (status.includes("college") || status.includes("postsecondary")) pathwayHints.add("college");

    const matches: PartnerMatch[] = (partners ?? []).map((p: any) => {
      const reasons: string[] = [];
      let score = 0;

      const partnerPathways: string[] = p.pathway_categories ?? [];
      const overlap = partnerPathways.filter((c) => pathwayHints.has(c.toLowerCase()));
      if (overlap.length > 0) {
        score += overlap.length * 12;
        reasons.push(`Supports your ${overlap.join(", ")} goals`);
      }

      const description = (p.description ?? "").toLowerCase();
      const services = (p.services_offered ?? []).join(" ").toLowerCase();
      const blob = `${description} ${services}`;
      let interestHits = 0;
      interestTokens.forEach((t) => {
        if (blob.includes(t)) interestHits++;
      });
      if (interestHits > 0) {
        score += Math.min(interestHits * 3, 18);
        reasons.push(`Matches ${interestHits} interest${interestHits > 1 ? "s" : ""} in your profile`);
      }
      let needHits = 0;
      needTokens.forEach((t) => {
        if (blob.includes(t)) needHits++;
      });
      if (needHits > 0) {
        score += needHits * 4;
        reasons.push(`Addresses support needs in your profile`);
      }

      // Age fit
      if (student.age && p.age_range) {
        const rangeText: string = String(p.age_range);
        const nums = rangeText.match(/\d+/g)?.map(Number) ?? [];
        if (nums.length >= 2) {
          const [lo, hi] = nums;
          if (student.age >= lo && student.age <= hi) {
            score += 6;
            reasons.push(`Age fit (${rangeText})`);
          }
        }
      }

      // Verification weight
      if (p.verification_status === "verified") score += 5;
      if (p.is_featured) score += 4;
      if (p.verification_status === "needs_review") score -= 2;

      // Disability fit
      const dFocus: string[] = p.disability_focus ?? [];
      if (
        student.primary_disability_category &&
        dFocus.some((d) =>
          d.toLowerCase().includes(student.primary_disability_category!.toLowerCase()),
        )
      ) {
        score += 6;
        reasons.push("Specializes in your disability category");
      }

      const next_step =
        p.verification_status === "verified"
          ? "Visit the website or contact the organization to learn more"
          : "Verify availability and eligibility directly with the organization";

      return {
        partner_id: p.id,
        organization_name: p.organization_name,
        partner_type: p.partner_type,
        description: p.description,
        website_url: p.website_url,
        verification_status: p.verification_status,
        county: p.county,
        is_featured: p.is_featured,
        pathway_categories: partnerPathways,
        score,
        reasons,
        suggested_next_step: next_step,
      } satisfies PartnerMatch;
    });

    matches.sort((a, b) => b.score - a.score);
    const limit = data.limit ?? 24;
    return { matches: matches.filter((m) => m.score > 0).slice(0, limit) };
  });

// Saves a generated match into student_opportunity_matches (or saved_partners) for the pathway report.
export const persistPartnerMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { student_id: string; partner_id: string; match_reason: string; next_step?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_saved_partners").insert({
      student_id: data.student_id,
      partner_id: data.partner_id,
      saved_by_user_id: context.userId,
      notes: `${data.match_reason}${data.next_step ? "\n\nNext step: " + data.next_step : ""}`,
    } as never);
    if (error) throw error;
    return { ok: true };
  });
