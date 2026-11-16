import { assertReadinessStudentAccess, loadReadinessDocumentSources, readReadinessScoreRows } from "./readiness-sources.server";
import { PLANNING_SOURCE_GROUNDING } from "./planning-source-grounding";
import { assertExpectedViewer, viewerIntentSchema } from "./viewer-intent";
import { buildStructuredOutputSystem } from "@/lib/structured-output-system";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SourceRef, type SourceRef as SourceRefT } from "./pathway-v2";

/**
 * Friendly, AI-driven readiness + next-step callouts for one student.
 *
 * Pulls together the student profile, IEP extract, documents, goals,
 * readiness pillar scores, family priorities, and Student Voice — then
 * asks Lovable AI to return a small, warm narrative the family can act
 * on this week. Tone matches the Pathway Report (7th-grade, plain).
 */

const PillarCallout = z.object({
  pillar: z.string().min(1).max(48),
  score: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(["strength", "steady", "growing", "needs_focus", "not_assessed"]),
  what_we_see: z.string().min(1).max(280),
  why_it_matters: z.string().min(1).max(240),
});

const FriendlyNextStep = z.object({
  title: z.string().min(1).max(120),
  who: z.enum(["family", "student", "educator", "team"]),
  when: z.enum(["this_week", "this_month", "before_next_meeting"]),
  steps: z.array(z.string().min(1).max(240)).min(1).max(3),
  why: z.string().min(1).max(220),
});

const InsightsSchema = z.object({
  headline: z.string().min(1).max(160),
  readiness_summary: z.string().min(1).max(600),
  pillar_callouts: z.array(PillarCallout).min(2).max(5),
  friendly_next_steps: z.array(FriendlyNextStep).min(2).max(4),
  encouragement: z.string().min(1).max(220),
});

export type ReadinessInsights = z.infer<typeof InsightsSchema> & {
  sources: SourceRefT[];
  generated_at: string;
};

function aiKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service is not configured.");
  return key;
}

function rethrowFriendly(err: unknown, fallback: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429"))
    throw new Error("The AI is busy right now. Please try again in a moment.");
  if (msg.includes("402"))
    throw new Error("AI usage limit reached. Please add credits to continue.");
  throw new Error(fallback);
}

export const generateReadinessInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ ...viewerIntentSchema.shape, student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    await assertReadinessStudentAccess(supabase, userId, data.student_id);

    const sourceResults = await Promise.all([
      supabase
        .from("students")
        .select(
          "first_name, grade_band, age, strengths_summary, interests_summary, support_needs_summary, family_priorities, student_voice_statement, readiness_level, current_transition_status, primary_disability_category",
        )
        .eq("id", data.student_id)
        .maybeSingle(),
      supabase
        .from("goals")
        .select("category, title, status")
        .eq("student_id", data.student_id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false }).order("id")
        .limit(20),
      readReadinessScoreRows(supabase, data.student_id),
      supabase
        .from("student_voice_responses")
        .select("response_text")
        .eq("student_id", data.student_id)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(8),
      supabase
        .from("student_intakes")
        .select(
          "family_priorities, family_concerns_extended, student_worries, desired_postsecondary_outcomes, services_received",
        )
        .eq("student_id", data.student_id)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(1)
        .maybeSingle(),
      loadReadinessDocumentSources(supabase, userId, data.student_id),
    ]).catch(() => {
      throw new Error("We couldn't load the planning information needed for these insights. Please try again.");
    });
    if (sourceResults.slice(0, 5).some(result => "error" in result && result.error) ||
        [1, 2, 3].some(index => !("data" in sourceResults[index]) || !Array.isArray(sourceResults[index].data))) {
      throw new Error("We couldn't load the planning information needed for these insights. Please try again.");
    }
    const [
      { data: student },
      { data: goals },
      { data: readiness },
      { data: voice },
      { data: intake },
      documentSources,
    ] = sourceResults;

    if (!student) throw new Error("Student not found or you don't have access.");

    // Only unambiguous, valid recorded scores can support numeric readiness badges.
    const pillarKey = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    const categoryCounts = new Map<string, number>();
    for (const row of readiness ?? []) {
      const key = pillarKey(row.category);
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }
    const scoredReadiness = (readiness ?? []).filter(row =>
      !!row.category.trim() && typeof row.score === "number" && Number.isFinite(row.score) &&
      row.score >= 0 && row.score <= 100 && categoryCounts.get(pillarKey(row.category)) === 1,
    );
    const recordedScores = new Map(scoredReadiness.map(row => [pillarKey(row.category), row.score!]));

    const sources: SourceRefT[] = [];
    sources.push({ kind: "profile", label: `${student.first_name}'s profile` });
    if (scoredReadiness.length) {
      sources.push({ kind: "readiness", label: `${scoredReadiness.length} recorded readiness score${scoredReadiness.length === 1 ? "" : "s"}` });
    }
    if (goals && goals.length) {
      sources.push({ kind: "goal", label: `${goals.length} recent active goal${goals.length === 1 ? "" : "s"}` });
    }
    if (voice && voice.length) {
      sources.push({ kind: "student_voice", label: `${voice.length} Student Voice responses` });
    }
    if (documentSources.reviewed) {
      sources.push({ kind: "iep_extraction", label: "Reviewed document sections" });
    }
    if (documentSources.documents.length) {
      sources.push({ kind: "iep_doc", label: `${documentSources.documents.length} recent planning document${documentSources.documents.length === 1 ? "" : "s"}` });
    }
    if (intake) sources.push({ kind: "intake", label: "Pathway Builder responses" });
    if (intake?.family_priorities || student.family_priorities) {
      sources.push({ kind: "family_priority", label: "Family priorities" });
    }

    const profileSnapshot = {
      first_name: student.first_name,
      grade_band: student.grade_band,
      age: student.age,
      transition_status: student.current_transition_status,
      disability_category: student.primary_disability_category,
      strengths: student.strengths_summary,
      interests: student.interests_summary,
      support_needs: student.support_needs_summary,
      family_priorities: intake?.family_priorities ?? student.family_priorities,
      student_voice_statement: student.student_voice_statement,
      family_concerns: intake?.family_concerns_extended,
      student_worries: intake?.student_worries,
      desired_outcomes: intake?.desired_postsecondary_outcomes,
      services_received: intake?.services_received,
    };

    const readinessSnapshot = scoredReadiness.map((r) => ({
      pillar: r.category,
      score: r.score,
      recommendation: r.recommendation,
    }));

    const goalsSnapshot = (goals ?? []).map((g) => ({
      category: g.category,
      title: g.title,
      status: g.status,
    }));

    const voiceSnapshot = (voice ?? []).map((v) => v.response_text).filter(Boolean);

    const docsSnapshot = documentSources.documents;
    const extractionSnapshot = documentSources.reviewed;

    const prompt = `You are TransitionForward, a warm, plain-language guide for families and educators planning life after high school. Write at roughly a 7th-grade reading level. No jargon. No shame. Be specific to THIS student.

Generate a short readiness snapshot and friendly next-step callouts for ${student.first_name}. Base every callout on the data below — never invent diagnoses, services, scores, or family wishes. If a category has no data, say so gently rather than guessing.

For each pillar callout: use the exact recorded pillar name when a score is supplied. Copy that recorded score without rounding or changing it; set status to "strength" (>=80), "steady" (>=60 and <80), "growing" (>=40 and <60), or "needs_focus" (<40). If there is no valid recorded score for an area, use score null and status "not_assessed". Never infer an assessed level or numeric score from a goal, interest, profile label or document summary. Required callouts may explain an unsupplied assessment and propose a question; do not invent evidence to fill the array minimum. Keep "what_we_see" attributed to the available source; keep "why_it_matters" practical and brief.

For each friendly next step: assign "who" (family / student / educator / team), assign "when" (this_week / this_month / before_next_meeting), and give 1-3 concrete steps a real person can do. Steps should be small and specific, with proposed roles and timing to confirm rather than claimed agreements or eligibility. Document titles and status below are metadata, not proof that their contents were reviewed. Only the supplied human-reviewed document sections may support document-based callouts. They are reported planning information, not independent verification. An unreviewed newer document must not be replaced by an older summary. Goals (up to 20), Student Voice responses (up to eight) and planning documents (up to ten) are recent samples, not complete histories; do not claim complete coverage.

End with one short, sincere line of encouragement.

STUDENT PROFILE:
${JSON.stringify(profileSnapshot)}

READINESS PILLAR SCORES:
${JSON.stringify(readinessSnapshot)}

RECENT ACTIVE GOALS (up to 20):
${JSON.stringify(goalsSnapshot)}

STUDENT VOICE (most recent responses):
${JSON.stringify(voiceSnapshot)}

RECENT PLANNING DOCUMENT METADATA (up to ten; not complete file coverage):
${JSON.stringify(docsSnapshot)}

REVIEWED SECTIONS FROM THE NEWEST PLANNING DOCUMENT (not independent verification):
${JSON.stringify(extractionSnapshot)}`;

    // No provider request if current student access or the selected reviewed
    // document projection changed while collecting the planning snapshot.
    await assertReadinessStudentAccess(supabase, userId, data.student_id);
    await documentSources.assertCurrent();
    try {
      const gateway = createLovableAiGatewayProvider(aiKey());
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: InsightsSchema }),
        system: await buildStructuredOutputSystem(InsightsSchema, PLANNING_SOURCE_GROUNDING),
        prompt,
      });
      const insights = InsightsSchema.parse(experimental_output);
      // Do not return a departed student's result or silently reuse a retired,
      // superseded or newly unreviewed document after generation completes.
      await assertReadinessStudentAccess(supabase, userId, data.student_id);
      await documentSources.assertCurrent();
      return {
        ...insights,
        pillar_callouts: insights.pillar_callouts.map(callout => {
          const score = recordedScores.get(pillarKey(callout.pillar));
          return {
            ...callout,
            pillar: callout.pillar.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(),
            score: score ?? null,
            status: score === undefined ? "not_assessed" as const
              : score >= 80 ? "strength" as const
              : score >= 60 ? "steady" as const
              : score >= 40 ? "growing" as const : "needs_focus" as const,
          };
        }),
        sources,
        generated_at: new Date().toISOString(),
      } satisfies ReadinessInsights;
    } catch (err) {
      rethrowFriendly(err, "We couldn't generate readiness insights right now.");
    }
  });

// satisfy `SourceRef` import (zod schema referenced at type level only)
void SourceRef;
