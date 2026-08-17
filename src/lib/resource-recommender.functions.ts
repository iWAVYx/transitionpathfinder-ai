import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageFromDob, transitionBand } from "@/lib/transition-age";

export type RecommendedResource = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  topic: string | null;
  url: string | null;
  source_name: string | null;
  grade_range: string | null;
  review_status: string;
  score: number;
  reasons: string[];
  // Enriched connection metadata
  connects_to_goal_area: string | null;
  connects_to_support_need: string | null;
  audience: "student" | "family" | "educator";
  discuss_at_next_meeting: boolean;
};

const KEYWORD_GROUPS: { topic: string; words: string[] }[] = [
  { topic: "Employment", words: ["job", "work", "career", "employment", "internship", "vocational"] },
  { topic: "Education", words: ["college", "university", "school", "academic", "learning", "diploma"] },
  { topic: "Independent Living", words: ["independent", "living", "self-care", "daily", "household", "cooking", "budget"] },
  { topic: "Transportation", words: ["transportation", "transport", "bus", "driving", "travel", "commute"] },
  { topic: "Self-Advocacy", words: ["advocacy", "self-advocate", "voice", "rights", "iep", "communication"] },
  { topic: "Community", words: ["community", "recreation", "social", "volunteer"] },
  { topic: "Healthcare", words: ["health", "medical", "therapy", "wellness", "doctor", "appointment"] },
  { topic: "Benefits & Legal", words: ["ssi", "ssdi", "benefits", "guardianship", "legal", "medicaid"] },
];

function inferTopics(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return KEYWORD_GROUPS.filter((g) => g.words.some((w) => lower.includes(w))).map((g) => g.topic);
}

function gradeMatches(studentBand: string | null, resourceRange: string | null): boolean {
  if (!resourceRange || !studentBand) return true;
  const r = resourceRange.toLowerCase();
  if (r.includes("all") || r.includes("any")) return true;
  if (studentBand === "9-10" && (r.includes("9") || r.includes("10") || r.includes("middle") || r.includes("high"))) return true;
  if (studentBand === "11-12" && (r.includes("11") || r.includes("12") || r.includes("high") || r.includes("senior"))) return true;
  if (studentBand === "post-secondary" && (r.includes("post") || r.includes("adult") || r.includes("18+") || r.includes("transition"))) return true;
  return true;
}

export const recommendResourcesForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid(), limit: z.number().int().min(1).max(20).default(8) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(
        "id, age, date_of_birth, grade_band, strengths_summary, interests_summary, support_needs_summary, family_priorities, student_voice_statement, readiness_level, current_transition_status, primary_disability_category",
      )
      .eq("id", data.student_id)
      .maybeSingle();
    if (sErr || !student) return { items: [] as RecommendedResource[] };

    // Pull goals, readiness gap, and recent student voice for richer matching.
    const [{ data: goals }, { data: readiness }, { data: voice }] = await Promise.all([
      supabase
        .from("goals")
        .select("id, category, title, status")
        .eq("student_id", data.student_id)
        .neq("status", "archived"),
      supabase.from("readiness_scores").select("pillar, score").eq("student_id", data.student_id),
      supabase
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
    const voiceText = (voice ?? []).map((v: any) => v.response_text ?? "").join(" ");

    let lowestPillar: string | null = null;
    let lowestScore = Number.POSITIVE_INFINITY;
    for (const r of readiness ?? []) {
      const sc = Number((r as any).score ?? 0);
      if (sc < lowestScore) {
        lowestScore = sc;
        lowestPillar = String((r as any).pillar ?? "").toLowerCase();
      }
    }

    const age = student.age ?? ageFromDob((student as any).date_of_birth);
    const band = transitionBand(age, student.grade_band);

    const profileText = [
      student.strengths_summary,
      student.interests_summary,
      student.support_needs_summary,
      student.family_priorities,
      student.student_voice_statement,
      goalText,
      voiceText,
    ]
      .filter(Boolean)
      .join(" \n ");

    const studentTopics = new Set(inferTopics(profileText));
    const needTopics = new Set(inferTopics(student.support_needs_summary ?? ""));

    const { data: resources, error: rErr } = await supabase
      .from("resources")
      .select(
        "id, title, description, resource_type, topic, url, source_name, grade_range, audience, featured, role_relevance, pathway_relevance, review_status",
      )
      .in("published_status", ["published", "featured", "approved"])
      // Hide retired content from recommendations
      .not("review_status", "in", "(archived,outdated)")
      .limit(500);
    if (rErr || !resources) return { items: [] as RecommendedResource[] };

    const pathwayHint = (student.current_transition_status ?? "").toLowerCase();

    const scored: RecommendedResource[] = resources
      .map((r: any) => {
        const reasons: string[] = [];
        let score = 0;
        let connects_to_goal_area: string | null = null;
        let connects_to_support_need: string | null = null;

        const rTopics = inferTopics(`${r.title ?? ""} ${r.description ?? ""} ${r.topic ?? ""}`);
        for (const t of rTopics) {
          if (studentTopics.has(t)) {
            score += 3;
            const note = `Matches ${t.toLowerCase()} focus`;
            if (!reasons.includes(note)) reasons.push(note);
            if (!connects_to_goal_area) connects_to_goal_area = t;
          }
          if (needTopics.has(t)) {
            score += 2;
            if (!connects_to_support_need) connects_to_support_need = t;
          }
        }

        // Goal-category direct match
        for (const c of goalCategories) {
          const text = `${r.title ?? ""} ${r.description ?? ""} ${r.topic ?? ""}`.toLowerCase();
          if (text.includes(c)) {
            score += 4;
            reasons.push(`Linked to a "${c}" goal`);
            if (!connects_to_goal_area) connects_to_goal_area = c;
            break;
          }
        }

        // Readiness gap
        if (lowestPillar) {
          const text = `${r.title ?? ""} ${r.description ?? ""} ${r.topic ?? ""}`.toLowerCase();
          if (text.includes(lowestPillar)) {
            score += 3;
            reasons.push(`Helps close the ${lowestPillar} readiness gap`);
          }
        }

        if (gradeMatches(student.grade_band, r.grade_range)) {
          if (r.grade_range && student.grade_band) {
            score += 1;
            reasons.push(`Right grade level (${r.grade_range})`);
          }
        } else {
          score -= 2;
        }

        const roleRel = r.role_relevance as string[] | null;
        if (roleRel && (roleRel.includes("student") || roleRel.includes("all"))) {
          score += 1;
        }

        const pathwayRel = r.pathway_relevance as string[] | null;
        if (pathwayHint && pathwayRel && pathwayRel.some((p) => pathwayHint.includes(p.toLowerCase()))) {
          score += 2;
          if (reasons.length < 4) reasons.push("Matches current transition stage");
        }

        // Transition band relevance (CT planning age bands)
        if ((band === "age_16" || band === "age_17") && rTopics.includes("Employment")) {
          score += 2;
          reasons.push("Right time for work-based learning at age 16–17");
        }
        if ((band === "age_18_plus" || band === "exit_year") && rTopics.includes("Benefits & Legal")) {
          score += 3;
          reasons.push("Relevant to adult-services / transfer-of-rights planning");
        }

        if (r.featured) {
          score += 2;
          reasons.push("Featured by TransitionForward");
        }

        // Review-status boosts
        if (r.review_status === "verified") score += 2;
        if (r.review_status === "needs_review") score -= 1;

        if (score > 0 && reasons.length === 0) reasons.push("Verified, broadly relevant resource");

        // Audience routing from resource metadata
        const aud = (r.audience as string | string[] | null) ?? null;
        const audArr = Array.isArray(aud) ? aud.map((a) => a.toLowerCase()) : aud ? [String(aud).toLowerCase()] : [];
        const audience: RecommendedResource["audience"] = audArr.some((a) => a.includes("student"))
          ? "student"
          : audArr.some((a) => a.includes("family") || a.includes("parent"))
            ? "family"
            : "educator";

        return {
          id: r.id,
          title: r.title,
          description: r.description,
          resource_type: r.resource_type,
          topic: r.topic,
          url: r.url,
          source_name: r.source_name,
          grade_range: r.grade_range,
          review_status: r.review_status ?? "verified",
          score,
          reasons,
          connects_to_goal_area,
          connects_to_support_need,
          audience,
          discuss_at_next_meeting:
            score >= 8 || band === "age_16" || band === "age_17" || band === "age_18_plus" || band === "exit_year",
        } satisfies RecommendedResource;
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, data.limit);

    return { items: scored };
  });
