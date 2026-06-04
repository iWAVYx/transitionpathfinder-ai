import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecommendedResource = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  topic: string | null;
  url: string | null;
  source_name: string | null;
  grade_range: string | null;
  score: number;
  reasons: string[];
};

const KEYWORD_GROUPS: { topic: string; words: string[] }[] = [
  { topic: "Employment", words: ["job", "work", "career", "employment", "internship", "vocational"] },
  { topic: "Education", words: ["college", "university", "school", "academic", "learning", "diploma"] },
  { topic: "Independent Living", words: ["independent", "living", "self-care", "daily", "household", "cooking", "budget"] },
  { topic: "Self-Advocacy", words: ["advocacy", "self-advocate", "voice", "rights", "iep", "communication"] },
  { topic: "Community", words: ["community", "transportation", "social", "recreation", "volunteer"] },
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
  .inputValidator((i: unknown) =>
    z.object({ student_id: z.string().uuid(), limit: z.number().int().min(1).max(20).default(8) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(
        "id, grade_band, strengths_summary, interests_summary, support_needs_summary, family_priorities, student_voice_statement, readiness_level, current_transition_status",
      )
      .eq("id", data.student_id)
      .maybeSingle();
    if (sErr || !student) return { items: [] as RecommendedResource[] };

    const profileText = [
      student.strengths_summary,
      student.interests_summary,
      student.support_needs_summary,
      student.family_priorities,
      student.student_voice_statement,
    ]
      .filter(Boolean)
      .join(" \n ");

    const studentTopics = new Set(inferTopics(profileText));

    const { data: resources, error: rErr } = await supabase
      .from("resources")
      .select("id, title, description, resource_type, topic, url, source_name, grade_range, audience")
      .eq("verified_status", "verified")
      .limit(500);
    if (rErr || !resources) return { items: [] as RecommendedResource[] };

    const scored: RecommendedResource[] = resources
      .map((r) => {
        const reasons: string[] = [];
        let score = 0;

        const rTopics = inferTopics(`${r.title ?? ""} ${r.description ?? ""} ${r.topic ?? ""}`);
        for (const t of rTopics) {
          if (studentTopics.has(t)) {
            score += 3;
            if (!reasons.includes(`Matches ${t.toLowerCase()} focus`)) reasons.push(`Matches ${t.toLowerCase()} focus`);
          }
        }

        const lowerProfile = profileText.toLowerCase();
        const titleLower = (r.title ?? "").toLowerCase();
        const descLower = (r.description ?? "").toLowerCase();
        const tokens = lowerProfile
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 4)
          .slice(0, 40);
        for (const tok of tokens) {
          if (titleLower.includes(tok) || descLower.includes(tok)) {
            score += 1;
            if (reasons.length < 3 && !reasons.some((x) => x.includes(tok))) {
              reasons.push(`Mentions "${tok}"`);
            }
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

        if (score > 0 && reasons.length === 0) reasons.push("Verified, broadly relevant resource");

        return {
          id: r.id,
          title: r.title,
          description: r.description,
          resource_type: r.resource_type,
          topic: r.topic,
          url: r.url,
          source_name: r.source_name,
          grade_range: r.grade_range,
          score,
          reasons,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, data.limit);

    return { items: scored };
  });
