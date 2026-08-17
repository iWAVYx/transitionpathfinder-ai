import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * BridgeForward — CT high school directory + matching engine.
 * Cautious language throughout; nothing here implies admission,
 * placement, or eligibility decisions.
 * ============================================================ */

export type CtSchool = {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  county: string | null;
  school_type: string;
  grades_served: string | null;
  website_url: string | null;
  admissions_url: string | null;
  application_window: string | null;
  transportation_notes: string | null;
  source_url: string | null;
  source_name: string | null;
  verification_status: string;
  last_verified_at: string | null;
};

export type CtProgram = {
  id: string;
  school_id: string;
  program_name: string;
  program_category: string;
  description: string | null;
  student_fit_tags: string[];
  support_considerations: string | null;
  application_requirements: string | null;
  verification_status: string;
};

// -------- Directory (verified records only) --------

export const listCtHighSchools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        school_type: z.string().max(40).optional(),
        county: z.string().max(60).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("ct_high_schools")
      .select("*")
      .eq("verification_status", "verified")
      .order("name");
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.school_type) q = q.eq("school_type", data.school_type as never);
    if (data.county) q = q.ilike("county", `%${data.county}%`);
    const { data: rows, error } = await q.limit(200);
    if (error) {
      console.error("listCtHighSchools failed", error);
      return { schools: [] as CtSchool[] };
    }
    return { schools: (rows ?? []) as CtSchool[] };
  });

export const getCtHighSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const [{ data: school }, { data: programs }] = await Promise.all([
      context.supabase
        .from("ct_high_schools")
        .select("*")
        .eq("id", data.id)
        .eq("verification_status", "verified")
        .maybeSingle(),
      context.supabase
        .from("ct_high_school_programs")
        .select("*")
        .eq("school_id", data.id)
        .eq("verification_status", "verified")
        .order("program_name"),
    ]);
    return {
      school: (school ?? null) as CtSchool | null,
      programs: (programs ?? []) as CtProgram[],
    };
  });

// -------- Matching engine --------

const CAUTIOUS_PHRASES = {
  fit: "Possible fit — worth exploring with your school team.",
  team: "Discuss with your PPT or school transition team before applying.",
} as const;

type MatchResult = {
  school: CtSchool;
  program: CtProgram | null;
  score: number;
  reasons: string[];
  student_factors: string[];
  questions_to_ask: string[];
  needs_review: string[];
  discuss_with_team: boolean;
};

function tokenize(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export const searchSchoolsForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: profile }, { data: schools }, { data: programs }] =
      await Promise.all([
        supabase
          .from("bridgeforward_profiles")
          .select("*")
          .eq("student_id", data.studentId)
          .maybeSingle(),
        supabase
          .from("ct_high_schools")
          .select("*")
          .eq("verification_status", "verified"),
        supabase
          .from("ct_high_school_programs")
          .select("*")
          .eq("verification_status", "verified"),
      ]);

    if (!profile) {
      return {
        matches: [] as MatchResult[],
        needsProfile: true,
        message:
          "Add a BridgeForward profile first so we can suggest schools worth exploring.",
      };
    }

    const interestTokens = new Set(
      [
        ...tokenize(profile.interests),
        ...tokenize(profile.favorite_subjects),
        ...tokenize(profile.extracurricular_interests),
      ].filter(Boolean),
    );
    const supportTokens = new Set(
      [
        ...tokenize(profile.subjects_needing_support),
        ...tokenize(profile.executive_functioning_needs),
        ...tokenize(profile.social_emotional_support_needs),
        ...tokenize(profile.learning_challenges),
      ].filter(Boolean),
    );
    const envTokens = new Set(tokenize(profile.preferred_school_environment));
    const considered = (profile.high_school_options_considered ?? "")
      .toLowerCase();

    const results: MatchResult[] = [];

    for (const school of schools ?? []) {
      const schoolPrograms = (programs ?? []).filter(
        (p) => p.school_id === school.id,
      );
      const items: { program: CtProgram | null }[] = schoolPrograms.length
        ? schoolPrograms.map((p) => ({ program: p as CtProgram }))
        : [{ program: null }];

      for (const { program } of items) {
        const reasons: string[] = [];
        const student_factors: string[] = [];
        const questions_to_ask: string[] = [];
        const needs_review: string[] = [];
        let score = 0;

        // Interest tag overlap
        if (program) {
          const overlap = (program.student_fit_tags ?? []).filter((t) =>
            Array.from(interestTokens).some(
              (i) => t.includes(i) || i.includes(t.replace(/-/g, "")),
            ),
          );
          if (overlap.length) {
            score += overlap.length * 3;
            reasons.push(
              `Program tags align with student interests: ${overlap.join(", ")}.`,
            );
            student_factors.push(
              "Student-reported interests and favorite subjects",
            );
          }
        }

        // Considered list boost
        if (considered && considered.includes(school.name.toLowerCase().split(" ")[0])) {
          score += 4;
          reasons.push(
            `Your family already listed this school as one to consider.`,
          );
          student_factors.push("High school options the family is considering");
        }

        // Support considerations match
        if (program?.support_considerations && supportTokens.size) {
          const haystack = program.support_considerations.toLowerCase();
          const hits = Array.from(supportTokens).filter((t) =>
            haystack.includes(t),
          );
          if (hits.length) {
            score += hits.length * 2;
            reasons.push(
              "Program notes mention supports that may relate to the student's support needs.",
            );
            student_factors.push("Documented support and learning needs");
          }
        }

        // Environment preference
        if (envTokens.size && program) {
          const env = (program.student_fit_tags ?? []).join(" ");
          for (const t of envTokens) {
            if (env.includes(t)) {
              score += 1;
              reasons.push(
                "Program environment may match the family's preferred setting.",
              );
              break;
            }
          }
        }

        // Transportation flag
        if (
          profile.transportation_considerations &&
          !school.transportation_notes
        ) {
          needs_review.push(
            "Transportation details for this school are not yet recorded — ask the school directly.",
          );
        }

        // Standard questions every family should ask
        questions_to_ask.push(
          "What supports are typically available for students with IEPs or 504 plans?",
          "How does the transition into 9th grade work for incoming students?",
          "What does a typical week look like in this program?",
        );
        if (program?.application_requirements) {
          questions_to_ask.push(
            "Can you walk us through the application timeline and requirements?",
          );
        }

        // Always cautious
        if (!reasons.length) {
          reasons.push(CAUTIOUS_PHRASES.fit);
        }
        needs_review.push(
          "Confirm program details and current openings directly with the school.",
        );

        results.push({
          school: school as CtSchool,
          program,
          score,
          reasons,
          student_factors: Array.from(new Set(student_factors)),
          questions_to_ask,
          needs_review,
          discuss_with_team: true,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return { matches: results.slice(0, 25), needsProfile: false };
  });

// -------- Saved matches --------

export const listSavedMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("bridgeforward_school_matches")
      .select(
        "*, school:ct_high_schools(*), program:ct_high_school_programs(*)",
      )
      .eq("student_id", data.studentId)
      .order("created_at", { ascending: false });
    return { matches: rows ?? [] };
  });

export const saveSchoolMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        school_id: z.string().uuid(),
        program_id: z.string().uuid().nullable().optional(),
        reasons: z.array(z.string()).default([]),
        student_factors: z.array(z.string()).default([]),
        questions_to_ask: z.array(z.string()).default([]),
        needs_review: z.array(z.string()).default([]),
        score: z.number().optional(),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("bridgeforward_school_matches")
      .upsert(
        {
          student_id: data.student_id,
          school_id: data.school_id,
          program_id: data.program_id ?? null,
          status: "saved",
          score: data.score ?? null,
          reasons: data.reasons,
          student_factors: data.student_factors,
          questions_to_ask: data.questions_to_ask,
          needs_review: data.needs_review,
          discuss_with_team: true,
          notes: data.notes ?? null,
          saved_by: userId,
        },
        {
          onConflict: "student_id,school_id,program_id",
        },
      );
    if (error) {
      console.error("saveSchoolMatch failed", error);
      throw new Error("Could not save match.");
    }
    return { ok: true as const };
  });

export const updateMatchStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["suggested", "saved", "discussed", "dismissed"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bridgeforward_school_matches")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Could not update match.");
    return { ok: true as const };
  });

export const listFamilyResources = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("bridgeforward_resources")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    return { resources: data ?? [] };
  });
