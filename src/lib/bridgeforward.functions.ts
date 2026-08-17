import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * BridgeForward (grades 6-8) — middle-school transition pathway.
 * All access is scoped through the existing can_access_student /
 * can_edit_student RLS helpers; partners can never reach these rows.
 * ============================================================ */

// -------- Profile (1:1 with students) --------

const ProfileInput = z.object({
  student_id: z.string().uuid(),
  grade: z.number().int().min(6).max(8).nullable().optional(),
  current_school: z.string().trim().max(160).optional().nullable(),
  district: z.string().trim().max(160).optional().nullable(),
  interests: z.string().trim().max(2000).optional().nullable(),
  favorite_subjects: z.string().trim().max(1000).optional().nullable(),
  subjects_needing_support: z.string().trim().max(1000).optional().nullable(),
  learning_strengths: z.string().trim().max(2000).optional().nullable(),
  learning_challenges: z.string().trim().max(2000).optional().nullable(),
  executive_functioning_needs: z.string().trim().max(2000).optional().nullable(),
  social_emotional_support_needs: z.string().trim().max(2000).optional().nullable(),
  current_supports: z.string().trim().max(2000).optional().nullable(),
  extracurricular_interests: z.string().trim().max(2000).optional().nullable(),
  preferred_school_environment: z.string().trim().max(1000).optional().nullable(),
  high_school_options_considered: z.string().trim().max(2000).optional().nullable(),
  student_hopes_for_high_school: z.string().trim().max(2000).optional().nullable(),
  family_concerns: z.string().trim().max(2000).optional().nullable(),
  transportation_considerations: z.string().trim().max(1000).optional().nullable(),
});

export type BridgeforwardProfile = z.infer<typeof ProfileInput> & {
  id: string;
  updated_at: string;
};

export const getBridgeforwardProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bridgeforward_profiles")
      .select("*")
      .eq("student_id", data.studentId)
      .maybeSingle();
    if (error) {
      console.error("getBridgeforwardProfile failed", error);
      return { profile: null };
    }
    return { profile: row };
  });

export const upsertBridgeforwardProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => ProfileInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("bridgeforward_profiles")
      .upsert(
        { ...data, created_by: userId },
        { onConflict: "student_id" },
      );
    if (error) {
      console.error("upsertBridgeforwardProfile failed", error);
      throw new Error("Could not save the BridgeForward profile.");
    }
    return { ok: true as const };
  });

// -------- High School Options (per-student rows) --------

const OptionInput = z.object({
  id: z.string().uuid().optional(),
  student_id: z.string().uuid(),
  school_name: z.string().trim().min(1).max(160),
  option_type: z.enum([
    "neighborhood",
    "magnet",
    "technical",
    "charter",
    "specialized",
    "alternative",
    "private_ood",
    "district_program",
  ]),
  rank: z.number().int().min(0).max(20).nullable().optional(),
  school_size_environment: z.string().trim().max(500).optional().nullable(),
  academic_fit_notes: z.string().trim().max(2000).optional().nullable(),
  support_services_notes: z.string().trim().max(2000).optional().nullable(),
  career_technical_notes: z.string().trim().max(2000).optional().nullable(),
  extracurricular_notes: z.string().trim().max(2000).optional().nullable(),
  accessibility_notes: z.string().trim().max(2000).optional().nullable(),
  transportation_notes: z.string().trim().max(1000).optional().nullable(),
  contact_info: z.string().trim().max(500).optional().nullable(),
  pros: z.string().trim().max(2000).optional().nullable(),
  cons: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const listHighSchoolOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("high_school_options")
      .select("*")
      .eq("student_id", data.studentId)
      .order("rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listHighSchoolOptions failed", error);
      return { options: [] };
    }
    return { options: rows ?? [] };
  });

export const upsertHighSchoolOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => OptionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, created_by: userId };
    const { data: row, error } = await supabase
      .from("high_school_options")
      .upsert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("upsertHighSchoolOption failed", error);
      throw new Error("Could not save high school option.");
    }
    return { id: row.id };
  });

export const deleteHighSchoolOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("high_school_options")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Could not delete option.");
    return { ok: true as const };
  });

// -------- Fit Review --------

const FitReviewInput = z.object({
  student_id: z.string().uuid(),
  preferred_option_id: z.string().uuid().nullable().optional(),
  family_priorities: z.string().trim().max(4000).optional().nullable(),
  student_voice: z.string().trim().max(4000).optional().nullable(),
  questions_for_team: z.string().trim().max(4000).optional().nullable(),
  comparison_priorities: z.record(z.string(), z.unknown()).optional(),
});

export const getFitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("high_school_fit_reviews")
      .select("*")
      .eq("student_id", data.studentId)
      .maybeSingle();
    return { review: row };
  });

export const upsertFitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => FitReviewInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      ...data,
      comparison_priorities: (data.comparison_priorities ?? {}) as never,
      created_by: userId,
    };
    const { error } = await supabase
      .from("high_school_fit_reviews")
      .upsert(payload, { onConflict: "student_id" });
    if (error) {
      console.error("upsertFitReview failed", error);
      throw new Error("Could not save fit review.");
    }
    return { ok: true as const };
  });

// -------- Readiness Snapshot (versioned) --------

export const listReadinessSnapshots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("bridgeforward_readiness_snapshots")
      .select("*")
      .eq("student_id", data.studentId)
      .order("version", { ascending: false });
    return { snapshots: rows ?? [] };
  });

export const generateReadinessSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Pull source material the team has already entered.
    const [{ data: profile }, { data: options }, { data: review }, { data: voice }] =
      await Promise.all([
        supabase
          .from("bridgeforward_profiles")
          .select("*")
          .eq("student_id", data.studentId)
          .maybeSingle(),
        supabase
          .from("high_school_options")
          .select("*")
          .eq("student_id", data.studentId),
        supabase
          .from("high_school_fit_reviews")
          .select("*")
          .eq("student_id", data.studentId)
          .maybeSingle(),
        supabase
          .from("student_voice_responses")
          .select("prompt_key,response_text")
          .eq("student_id", data.studentId)
          .eq("grade_band", "middle_school"),
      ]);

    if (!profile) {
      throw new Error("Add a BridgeForward profile first.");
    }

    // Latest version.
    const { data: latest } = await supabase
      .from("bridgeforward_readiness_snapshots")
      .select("version")
      .eq("student_id", data.studentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (latest?.version ?? 0) + 1;

    const voiceMap = Object.fromEntries(
      (voice ?? []).map((v) => [v.prompt_key, v.response_text]),
    );

    const studentSnapshot = [
      profile.interests && `Interests: ${profile.interests}`,
      profile.favorite_subjects && `Strong subjects: ${profile.favorite_subjects}`,
      profile.student_hopes_for_high_school &&
        `Hopes for high school: ${profile.student_hopes_for_high_school}`,
    ]
      .filter(Boolean)
      .join("\n");

    const learningSupports = [
      profile.subjects_needing_support &&
        `Subjects that need extra support: ${profile.subjects_needing_support}`,
      profile.executive_functioning_needs &&
        `Executive functioning: ${profile.executive_functioning_needs}`,
      profile.current_supports && `Current supports: ${profile.current_supports}`,
    ]
      .filter(Boolean)
      .join("\n");

    const checklist = [
      { item: "Visit at least two high school options", done: false },
      { item: "Talk with current case manager about transition supports", done: false },
      { item: "Complete a middle-school Student Voice reflection", done: !!voiceMap["voice-meeting"] },
      { item: "Identify two adults the student can go to for support", done: false },
      { item: "Build a simple weekly routine for homework + breaks", done: false },
    ];

    const thirtyDayPlan = [
      { week: 1, focus: "Talk through interests, strengths, and worries together." },
      { week: 2, focus: "Tour or research one high school option." },
      { week: 3, focus: "Write 3 questions to ask the receiving school team." },
      { week: 4, focus: "Update the BridgeForward profile with anything new." },
    ];

    const payload = {
      student_id: data.studentId,
      version: nextVersion,
      generated_by_ai: false,
      created_by: userId,
      student_snapshot: studentSnapshot || null,
      strengths_and_interests:
        [profile.learning_strengths, profile.extracurricular_interests]
          .filter(Boolean)
          .join("\n") || null,
      learning_supports: learningSupports || null,
      confidence_and_self_advocacy:
        profile.social_emotional_support_needs ||
        voiceMap["support"] ||
        null,
      high_school_fit_considerations:
        [
          profile.preferred_school_environment,
          profile.high_school_options_considered,
          (options ?? []).map((o) => o.school_name).join(", "),
        ]
          .filter(Boolean)
          .join("\n") || null,
      family_priorities: review?.family_priorities ?? profile.family_concerns ?? null,
      questions_for_school_team: review?.questions_for_team ?? null,
      suggested_next_steps: "Bring this snapshot to the next PPT or transition meeting.",
      before_high_school_checklist: checklist,
      thirty_day_plan: thirtyDayPlan,
    };

    const { data: row, error } = await supabase
      .from("bridgeforward_readiness_snapshots")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("generateReadinessSnapshot failed", error);
      throw new Error("Could not save the snapshot.");
    }
    return { snapshot: row };
  });

// -------- Middle-school Voice prompts (server-side helper) --------

export const MIDDLE_SCHOOL_VOICE_PROMPTS = [
  { key: "ms-strengths", question: "What are you good at — at school or outside school?" },
  { key: "ms-enjoy", question: "What do you love doing in your free time?" },
  { key: "ms-hard", question: "What feels hard right now? It's okay to be honest." },
  { key: "ms-support", question: "What kind of help works best for you when something is tough?" },
  { key: "ms-hs-hopes", question: "When you think about high school, what are you hoping for?" },
  { key: "ms-hs-worries", question: "What are you a little worried about for high school?" },
  { key: "voice-meeting", question: "What do you want your team to know at your next meeting?" },
] as const;

// -------- Program eligibility (drives nav + dashboard visibility) --------

const MIDDLE_SCHOOL_BAND_PATTERNS = [
  "middle",
  "6-8",
  "6–8",
  "grade_6",
  "grade_7",
  "grade_8",
  "6th",
  "7th",
  "8th",
];

function isMiddleSchoolBand(band: string | null | undefined): boolean {
  if (!band) return false;
  const v = band.toString().toLowerCase().trim();
  if (["6", "7", "8"].includes(v)) return true;
  return MIDDLE_SCHOOL_BAND_PATTERNS.some((p) => v.includes(p));
}

/**
 * Returns flags describing which program pathways the current user should
 * see in nav / dashboard. RLS scopes the student query, so this only
 * surfaces students the user can actually access.
 */
export const getProgramEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Any visible student in a middle-school band, OR an existing
    // BridgeForward profile on a visible student.
    const [{ data: students }, { data: bfProfiles }, { data: partnerRole }] =
      await Promise.all([
        supabase.from("students").select("id, grade_band"),
        supabase.from("bridgeforward_profiles").select("student_id, grade"),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "partner")
          .maybeSingle(),
      ]);

    const bandHit = (students ?? []).some((s) =>
      isMiddleSchoolBand(s.grade_band),
    );
    const profileHit = (bfProfiles ?? []).some(
      (p) => p.grade == null || (p.grade >= 6 && p.grade <= 8),
    );

    return {
      hasMiddleSchoolStudent: bandHit || profileHit,
      isPartner: Boolean(partnerRole),
    };
  });
