import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageFromDob, transitionBand } from "@/lib/transition-age";
import {
  buildMatchExplanation,
  type PartnerMatchExplanation,
} from "@/lib/partner-match-explanation";


/**
 * Heuristic matching engine: scores published partner organizations against
 * a single student's profile. Pure read; does not persist matches.
 *
 * Inputs feeding the score:
 *   - student profile (age, grade, county, disability, status, readiness)
 *   - active goals (category + title)
 *   - readiness scores (lowest pillar = gap to close)
 *   - student voice responses (recent themes/keywords)
 *   - family priorities, interests, strengths, support needs
 *
 * IMPORTANT — privacy: this function returns ONLY public partner metadata
 * and *why-matched* reasons derived from the student profile. It never
 * exposes IEP text, documents, or extractions to partners. Partner-facing
 * surfaces in the app do not call this function; it is for the family /
 * educator / case-manager view.
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
  // Enriched "connects to" metadata for the panel UI
  connects_to_goal_area: string | null;
  connects_to_support_need: string | null;
  audience: "student" | "family" | "team";
  discuss_at_next_meeting: boolean;
  // Workstream B — validated, versioned explanation DTO.
  explanation: PartnerMatchExplanation;
};

function tokens(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

export const matchPartnersForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { student_id: string; limit?: number }) => d)
  .handler(async ({ data, context }): Promise<{ matches: PartnerMatch[] }> => {
    const { data: studentRaw, error: e1 } = await context.supabase
      .from("students")
      .select(
        "id, age, date_of_birth, grade_band, interests_summary, strengths_summary, support_needs_summary, family_priorities, primary_disability_category, current_transition_status, readiness_level, school",
      )
      .eq("id", data.student_id)
      .single();
    if (e1 || !studentRaw) throw e1 ?? new Error("Student not found");
    const student = studentRaw as unknown as {
      age: number | null;
      date_of_birth: string | null;
      grade_band: string | null;
      interests_summary: string | null;
      strengths_summary: string | null;
      support_needs_summary: string | null;
      family_priorities: string | null;
      primary_disability_category: string | null;
      current_transition_status: string | null;
      readiness_level: string | null;
      school: string | null;
    };

    // Enrich with goals, readiness gap, and student voice — all server-side.
    const [{ data: goals }, { data: readiness }, { data: voice }] = await Promise.all([
      context.supabase
        .from("goals")
        .select("id, category, title, status")
        .eq("student_id", data.student_id)
        .neq("status", "archived"),
      context.supabase
        .from("readiness_scores")
        .select("pillar, score")
        .eq("student_id", data.student_id),
      context.supabase
        .from("student_voice_responses")
        .select("response_text")
        .eq("student_id", data.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const goalCategories = new Set(
      (goals ?? []).map((g: any) => String(g.category ?? "").toLowerCase()).filter(Boolean),
    );
    const goalText = (goals ?? []).map((g: any) => g.title).join(" ");

    // Lowest-scoring readiness pillar = biggest gap
    let lowestPillar: string | null = null;
    let lowestScore = Number.POSITIVE_INFINITY;
    for (const r of readiness ?? []) {
      const score = Number((r as any).score ?? 0);
      if (score < lowestScore) {
        lowestScore = score;
        lowestPillar = String((r as any).pillar ?? "").toLowerCase();
      }
    }

    const voiceText = (voice ?? []).map((v: any) => v.response_text ?? "").join(" ");
    const age = student.age ?? ageFromDob(student.date_of_birth);
    const band = transitionBand(age, student.grade_band);

    const { data: partners, error: e2 } = await context.supabase
      .from("partner_organizations")
      .select(
        "id, organization_name, partner_type, description, website_url, verification_status, county, is_featured, pathway_categories, audience_served, age_range, disability_focus, services_offered, opportunity_types",
      )
      .eq("is_public", true)
      // Hide partners that are explicitly retired from matching
      .not("verification_status", "in", "(archived,outdated)");
    if (e2) throw e2;

    const interestTokens = new Set([
      ...tokens(student.interests_summary),
      ...tokens(student.strengths_summary),
      ...tokens(student.family_priorities),
      ...tokens(goalText),
      ...tokens(voiceText),
    ]);
    const needTokens = new Set(tokens(student.support_needs_summary));
    const status = (student.current_transition_status ?? "").toLowerCase();

    // Infer pathway interests from text + transition status + goal categories
    const pathwayHints = new Set<string>();
    const hint = (k: string, words: string[]) => {
      if (words.some((w) => interestTokens.has(w))) pathwayHints.add(k);
    };
    hint("employment", ["job", "work", "career", "employment", "paycheck", "internship"]);
    hint("college", ["college", "university", "academic", "study"]);
    hint("technical_training", ["trade", "technical", "vocational", "welding", "automotive", "culinary", "hvac", "construction"]);
    hint("independent_living", ["independent", "living", "apartment", "cooking", "transportation", "transport", "bus"]);
    hint("day_program", ["community", "social", "activities"]);
    if (status.includes("employment")) pathwayHints.add("employment");
    if (status.includes("college") || status.includes("postsecondary")) pathwayHints.add("college");
    goalCategories.forEach((c) => {
      if (c.includes("employ")) pathwayHints.add("employment");
      if (c.includes("educat") || c.includes("college") || c.includes("postsec")) pathwayHints.add("college");
      if (c.includes("indep") || c.includes("living")) pathwayHints.add("independent_living");
      if (c.includes("communit")) pathwayHints.add("day_program");
      if (c.includes("transport")) pathwayHints.add("independent_living");
    });
    if (lowestPillar) {
      if (lowestPillar.includes("employ")) pathwayHints.add("employment");
      if (lowestPillar.includes("educat") || lowestPillar.includes("college")) pathwayHints.add("college");
      if (lowestPillar.includes("indep") || lowestPillar.includes("living")) pathwayHints.add("independent_living");
    }

    const matches: PartnerMatch[] = (partners ?? []).map((p: any) => {
      const reasons: string[] = [];
      let score = 0;
      let connects_to_goal_area: string | null = null;
      let connects_to_support_need: string | null = null;

      const partnerPathways: string[] = p.pathway_categories ?? [];
      const overlap = partnerPathways.filter((c) => pathwayHints.has(c.toLowerCase()));
      if (overlap.length > 0) {
        score += overlap.length * 12;
        reasons.push(`Supports ${overlap.join(", ").replace(/_/g, " ")} goals`);
        connects_to_goal_area = overlap[0];
      }

      // Goal-category direct match
      for (const c of goalCategories) {
        if (partnerPathways.some((pc) => pc.toLowerCase().includes(c) || c.includes(pc.toLowerCase()))) {
          score += 6;
          if (!connects_to_goal_area) connects_to_goal_area = c;
          reasons.push(`Linked to a "${c}" goal on this student's plan`);
          break;
        }
      }

      // Readiness gap connection
      if (lowestPillar && partnerPathways.some((pc) => pc.toLowerCase().includes(lowestPillar!))) {
        score += 5;
        reasons.push(`Helps close the ${lowestPillar} readiness gap`);
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
        reasons.push(`Matches ${interestHits} interest${interestHits > 1 ? "s" : ""} in this profile`);
      }
      let needHits = 0;
      needTokens.forEach((t) => {
        if (blob.includes(t)) {
          needHits++;
          if (!connects_to_support_need) connects_to_support_need = t;
        }
      });
      if (needHits > 0) {
        score += needHits * 4;
        reasons.push(`Addresses listed support needs`);
      }

      // Age fit
      if (age && p.age_range) {
        const rangeText: string = String(p.age_range);
        const nums = rangeText.match(/\d+/g)?.map(Number) ?? [];
        if (nums.length >= 2) {
          const [lo, hi] = nums;
          if (age >= lo && age <= hi) {
            score += 6;
            reasons.push(`Age fit (${rangeText})`);
          }
        }
      }

      // School / district name proximity (free-text match)
      if (student.school && p.county && student.school.toLowerCase().includes(String(p.county).toLowerCase())) {
        score += 6;
        reasons.push(`Local to ${p.county} County`);
      }

      // Transition band relevance
      if (band === "age_16" || band === "age_17") {
        if (partnerPathways.some((pc) => /employ|vocational|work/i.test(pc))) {
          score += 4;
          reasons.push("Right time for work-based learning at age 16–17");
        }
      }
      if (band === "exit_year" || band === "age_18_plus") {
        if (partnerPathways.some((pc) => /adult|college|postsec|employ/i.test(pc))) {
          score += 5;
          reasons.push("Adult-services connection for exit-year planning");
        }
      }

      // Verification weight
      if (p.verification_status === "verified") score += 5;
      if (p.verification_status === "featured" || p.is_featured) score += 4;
      if (p.verification_status === "needs_review") score -= 2;
      if (p.verification_status === "community_resource") score += 1;

      // Disability fit
      const dFocus: string[] = p.disability_focus ?? [];
      if (
        student.primary_disability_category &&
        dFocus.some((d) =>
          d.toLowerCase().includes(student.primary_disability_category!.toLowerCase()),
        )
      ) {
        score += 6;
        reasons.push("Specializes in this disability category");
      }

      const next_step =
        p.verification_status === "verified" || p.verification_status === "featured"
          ? "Visit the website or contact the organization to learn more"
          : p.verification_status === "needs_review"
            ? "Verify availability and eligibility before sharing with family"
            : "Confirm details directly with the organization before pursuing";

      // Audience routing: partners that mention parent/family land with family;
      // employment/college during 16+ → student facing; otherwise team.
      const audienceServed = (p.audience_served ?? []).map((a: string) => a.toLowerCase());
      const audience: PartnerMatch["audience"] = audienceServed.some((a: string) => a.includes("family") || a.includes("parent"))
        ? "family"
        : audienceServed.some((a: string) => a.includes("student"))
          ? "student"
          : "team";

      // Detect an out-of-range age for the conflicts channel.
      let ageOutOfRange: { studentAge: number | null; partnerRange: string | null } | null = null;
      if (age && p.age_range) {
        const rangeText: string = String(p.age_range);
        const nums = rangeText.match(/\d+/g)?.map(Number) ?? [];
        if (nums.length >= 2) {
          const [lo, hi] = nums;
          if (age < lo || age > hi) ageOutOfRange = { studentAge: age, partnerRange: rangeText };
        }
      }

      const explanation = buildMatchExplanation({
        rawScore: score,
        reasons,
        evidenceIds: [], // pathway evidence graph joins land here in a follow-up slice.
        ageOutOfRange,
        verificationStatus: p.verification_status,
      });

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
        connects_to_goal_area,
        connects_to_support_need,
        audience,
        // Worth surfacing at the next IEP/PPT for high-fit and adult-service partners
        discuss_at_next_meeting: score >= 18 || band === "age_16" || band === "age_17" || band === "age_18_plus" || band === "exit_year",
        explanation,
      } satisfies PartnerMatch;
    });

    matches.sort((a, b) => b.score - a.score);
    const limit = data.limit ?? 24;
    return { matches: matches.filter((m) => m.score > 0).slice(0, limit) };
  });

// Saves a generated match into student_opportunity_matches (or saved_partners) for the pathway report.
export const persistPartnerMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
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
