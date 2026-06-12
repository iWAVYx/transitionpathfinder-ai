import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  PathwayReportV2,
  computeDeterministicGaps,
  diffInputsForChangeSummary,
  isV2,
  type InputsUsed,
} from "./pathway-v2";


const IntakeSchema = z.object({
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1).max(80),
  grade_band: z.enum(["9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  strengths: z.string().trim().max(2000).optional().default(""),
  interests: z.string().trim().max(2000).optional().default(""),
  needs: z.string().trim().max(2000).optional().default(""),
  supports: z.string().trim().max(2000).optional().default(""),
  transportation: z.string().trim().max(500).optional().default(""),
  communication: z.string().trim().max(500).optional().default(""),
  current_goals: z.string().trim().max(2000).optional().default(""),
  family_concerns: z.string().trim().max(2000).optional().default(""),
  student_voice: z.string().trim().max(2000).optional().default(""),
  family_voice: z.string().trim().max(2000).optional().default(""),
  educator_input: z.string().trim().max(2000).optional().default(""),
});

export type IntakeInput = z.infer<typeof IntakeSchema>;

const ReportSchema = z.object({
  summary: z.string().describe("2-3 sentence warm, plain-language summary of this student."),
  strengths_snapshot: z.array(z.string()).min(2).max(6),
  career_pathways: z
    .array(
      z.object({
        title: z.string(),
        why_it_fits: z.string(),
        example_roles: z.array(z.string()).min(1).max(4),
        first_steps: z.array(z.string()).min(1).max(4),
      }),
    )
    .min(2)
    .max(4),
  education_training_options: z.array(z.string()).min(2).max(6),
  life_skills_focus: z.array(z.string()).min(3).max(6),
  family_questions_for_ppt: z.array(z.string()).min(3).max(6),
  teacher_next_steps: z.array(z.string()).min(3).max(6),
  thirty_day_plan: z
    .array(z.object({ week: z.number().int().min(1).max(4), action: z.string() }))
    .length(4),
  encouragement_to_student: z
    .string()
    .describe("A short, warm note (2-3 sentences) addressed to the student in plain language."),

  /* ---------- NEW: Student Snapshot ---------- */
  student_snapshot: z
    .object({
      grade_level: z.string(),
      graduation_timeline: z.string(),
      primary_interests: z.array(z.string()).min(1).max(6),
      learning_preferences: z.array(z.string()).min(1).max(5),
      communication_style: z.string(),
      current_transition_status: z.string(),
      readiness_level: z.enum(["emerging", "developing", "progressing", "ready"]),
      family_priorities: z.array(z.string()).min(1).max(5),
      student_voice_quote: z.string(),
    })
    .optional(),

  /* ---------- NEW: SPIN analysis ---------- */
  spin_analysis: z
    .object({
      strengths: z.array(z.string()).min(2).max(6),
      preferences: z.array(z.string()).min(2).max(6),
      interests: z.array(z.string()).min(2).max(6),
      needs: z.array(z.string()).min(2).max(6),
      motivators: z.array(z.string()).min(1).max(5),
      barriers: z.array(z.string()).min(1).max(5),
      environmental_supports: z.array(z.string()).min(1).max(5),
      areas_for_growth: z.array(z.string()).min(1).max(5),
      what_this_means: z.string(),
    })
    .optional(),

  /* ---------- NEW: Postsecondary goal breakdown ---------- */
  postsecondary_goals: z
    .array(
      z.object({
        area: z.string(),
        current_status: z.string(),
        suggested_direction: z.string(),
        why_it_matters: z.string(),
        measurable_goal_language: z.string(),
        next_steps: z.array(z.string()).min(1).max(4),
        who_supports: z.array(z.string()).min(1).max(4),
        evidence_needed: z.array(z.string()).min(1).max(4),
      }),
    )
    .min(4)
    .max(11)
    .optional(),

  /* ---------- NEW: Recommended pathways ---------- */
  recommended_pathways: z
    .array(
      z.object({
        type: z.enum(["best-fit", "backup", "exploration", "stretch", "support-needed"]),
        title: z.string(),
        why_it_fits: z.string(),
        related_strengths: z.array(z.string()).min(1).max(5),
        possible_barriers: z.array(z.string()).min(1).max(4),
        supports_needed: z.array(z.string()).min(1).max(4),
        school_experiences: z.array(z.string()).min(1).max(4),
        community_experiences: z.array(z.string()).min(1).max(4),
        courses_or_programs: z.array(z.string()).min(1).max(4),
        career_clusters: z.array(z.string()).min(1).max(4),
        credentials: z.array(z.string()).min(1).max(4),
        partner_resources: z.array(z.string()).min(1).max(4),
        action_steps: z.object({
          thirty_day: z.array(z.string()).min(1).max(4),
          ninety_day: z.array(z.string()).min(1).max(4),
          six_month: z.array(z.string()).min(1).max(4),
          one_year: z.array(z.string()).min(1).max(4),
        }),
      }),
    )
    .min(3)
    .max(5)
    .optional(),

  /* ---------- NEW: Career match cards ---------- */
  career_matches: z
    .array(
      z.object({
        cluster: z.string(),
        example_jobs: z.array(z.string()).min(1).max(5),
        skills_required: z.array(z.string()).min(1).max(5),
        education_needed: z.string(),
        work_environment: z.string(),
        accommodations: z.array(z.string()).min(1).max(4),
        readiness_level: z.enum(["emerging", "developing", "progressing", "ready"]),
        next_step: z.string(),
      }),
    )
    .min(3)
    .max(6)
    .optional(),

  /* ---------- NEW: Transition readiness scorecard ---------- */
  readiness_scorecard: z
    .array(
      z.object({
        category: z.string(),
        level: z.enum(["emerging", "developing", "progressing", "ready"]),
        evidence: z.string(),
        what_it_means: z.string(),
        growth_activity: z.string(),
        suggested_goal: z.string(),
      }),
    )
    .min(6)
    .max(14)
    .optional(),

  /* ---------- NEW: IEP translator ---------- */
  iep_translator: z
    .array(
      z.object({
        goal_text: z.string(),
        plain_meaning: z.string(),
        connected_services: z.array(z.string()).min(1).max(4),
        questions_to_ask: z.array(z.string()).min(1).max(4),
        what_student_should_know: z.string(),
        connected_to_real_life: z.string(),
        missing_information: z.array(z.string()).max(4),
      }),
    )
    .min(2)
    .max(6)
    .optional(),

  /* ---------- NEW: Data gaps ---------- */
  data_gaps: z
    .array(
      z.object({
        item: z.string(),
        why_it_matters: z.string(),
        who_can_help: z.string(),
        how_to_collect: z.string(),
        question_to_ask: z.string(),
      }),
    )
    .min(3)
    .max(8)
    .optional(),

  /* ---------- NEW: Student voice prompts ---------- */
  student_voice_prompts: z
    .array(
      z.object({
        prompt: z.string(),
        suggested_reflection: z.string(),
      }),
    )
    .min(5)
    .max(10)
    .optional(),

  /* ---------- NEW: Family action plan ---------- */
  family_action_plan: z
    .object({
      this_week: z.array(z.string()).min(2).max(5),
      this_month: z.array(z.string()).min(2).max(5),
      before_next_meeting: z.array(z.string()).min(2).max(5),
      this_school_year: z.array(z.string()).min(2).max(5),
      before_graduation: z.array(z.string()).min(2).max(5),
    })
    .optional(),

  /* ---------- NEW: Teacher action plan ---------- */
  teacher_action_plan: z
    .object({
      goal_updates: z.array(z.string()).min(1).max(5),
      progress_monitoring: z.array(z.string()).min(1).max(5),
      assessments_to_run: z.array(z.string()).min(1).max(5),
      classroom_activities: z.array(z.string()).min(1).max(5),
      family_communication: z.array(z.string()).min(1).max(5),
      student_conference_questions: z.array(z.string()).min(1).max(5),
      service_connections: z.array(z.string()).min(1).max(5),
      accommodations: z.array(z.string()).min(1).max(5),
      work_based_learning: z.array(z.string()).min(1).max(5),
    })
    .optional(),

  /* ---------- NEW: Meeting prep toolkit ---------- */
  meeting_prep_toolkit: z
    .object({
      questions_to_ask: z.array(z.string()).min(3).max(8),
      documents_to_bring: z.array(z.string()).min(2).max(6),
      concerns_to_raise: z.array(z.string()).min(1).max(5),
      strengths_to_highlight: z.array(z.string()).min(2).max(6),
      goals_to_review: z.array(z.string()).min(2).max(6),
      services_to_discuss: z.array(z.string()).min(2).max(6),
      student_voice_prompts: z.array(z.string()).min(2).max(5),
      follow_up_items: z.array(z.string()).min(2).max(5),
    })
    .optional(),

  /* ---------- NEW: Opportunity matches ---------- */
  opportunity_matches: z
    .array(
      z.object({
        category: z.string(),
        name: z.string(),
        why_it_fits: z.string(),
        what_student_gains: z.string(),
        readiness_level: z.enum(["emerging", "developing", "progressing", "ready"]),
        how_to_explore: z.string(),
        who_helps: z.string(),
      }),
    )
    .min(4)
    .max(10)
    .optional(),

  /* ---------- NEW: Progress timeline ---------- */
  progress_timeline: z
    .array(
      z.object({
        stage: z.string(),
        status: z.enum(["complete", "in-progress", "upcoming", "future"]),
        description: z.string(),
        milestones: z.array(z.string()).min(1).max(5),
        suggested_deadline: z.string().optional(),
      }),
    )
    .min(6)
    .max(10)
    .optional(),

  /* ---------- NEW: Trust signals ---------- */
  confidence_level: z.enum(["low", "moderate", "high"]).optional(),
  needs_human_review: z.array(z.string()).min(1).max(6).optional(),
});

export type PathwayReport = z.infer<typeof ReportSchema>;

function buildPrompt(intake: IntakeInput) {
  return `You are TransitionForward, a warm, trusted guide helping families, students, and educators plan life after high school for students receiving special education services in Connecticut. You speak in plain, hopeful, second-person language. You are NOT clinical. You honor student voice above all.

A ${intake.submitter_role} submitted this intake for a student we will call ${intake.student_first_name}.

STUDENT PROFILE
Grade band: ${intake.grade_band ?? "not specified"}
Strengths: ${intake.strengths || "(not provided)"}
Interests: ${intake.interests || "(not provided)"}
Needs / disability-related supports: ${intake.needs || "(not provided)"}
Supports that work: ${intake.supports || "(not provided)"}
Transportation: ${intake.transportation || "(not provided)"}
Communication: ${intake.communication || "(not provided)"}
Current IEP transition goals: ${intake.current_goals || "(not provided)"}

THREE VOICES
Student voice (in their own words): ${intake.student_voice || "(not provided)"}
Family voice (hopes, worries, what they want the team to know): ${intake.family_voice || intake.family_concerns || "(not provided)"}
Educator / case manager input (what they're seeing at school): ${intake.educator_input || "(not provided)"}

Generate the FULL TransitionForward Pathway Report — the flagship deliverable of this platform. It must feel personalized, professional, parent-friendly, student-centered, and teacher-usable. NEVER generic. Tie EVERY recommendation back to this student's specific interests, strengths, and stated needs.

Fill in EVERY top-level field of the schema. The schema is large on purpose. Be specific, not exhaustive — short, concrete bullets are better than long abstract ones. Use Connecticut-aware language (CT community colleges, CT technical high schools, Bureau of Rehabilitation Services / BRS, DDS, Level Up) when reasonable, but never invent specific program names you cannot verify.

Guidance for major sections:
- student_snapshot: warm hero card. readiness_level is one of "emerging" | "developing" | "progressing" | "ready". student_voice_quote should sound like the student.
- spin_analysis: connect strengths → real pathways (e.g. hands-on → technical ed, trades, healthcare support, culinary, automotive). The what_this_means tie-back is required.
- postsecondary_goals: 4-11 areas drawn from Education/training, Employment, Independent living, Community participation, Self-advocacy, Transportation, Financial literacy, Daily living, Social/emotional readiness, Health/wellness, Technology/digital skills. measurable_goal_language must be a draftable IEP-style sentence.
- recommended_pathways: 3-5 pathways spanning best-fit / backup / exploration / stretch / support-needed.
- career_matches: 3-6 cluster cards.
- readiness_scorecard: 6-14 categories from Self-advocacy, Career awareness, Job readiness, Communication, Independent living, Transportation, Financial literacy, Postsecondary readiness, Technology, Executive functioning, Social skills, Community participation, Daily routines, Problem-solving. Be supportive — never harsh.
- iep_translator: paraphrase from current_goals/intake; translate into plain English; flag missing info.
- data_gaps: be honest about what the intake did not provide.
- student_voice_prompts: addressed TO the student in first person ("What do I want…").
- family_action_plan: practical, doable, time-horizoned.
- teacher_action_plan: usable by a case manager next Monday.
- meeting_prep_toolkit: ready for the next PPT/IEP meeting.
- opportunity_matches: 4-10 cards using descriptive category names, not specific verified programs.
- progress_timeline: spans Self-awareness → Adult life transition. status is "complete" | "in-progress" | "upcoming" | "future".
- confidence_level + needs_human_review: be honest about uncertainty.

Tone: warm, hopeful, 7th-grade reading level, student-centered. When the three voices agree, name the shared direction. When they differ, honor the student's voice first and gently surface the difference for the next PPT. Use only the student's first name.`;
}

export const createPathwayReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IntakeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const { supabase, userId } = context;

    const { data: intake, error: intakeErr } = await supabase
      .from("student_intakes")
      .insert({
        user_id: userId,
        submitter_role: data.submitter_role,
        student_first_name: data.student_first_name,
        grade_band: data.grade_band ?? null,
        strengths: data.strengths || null,
        interests: data.interests || null,
        needs: data.needs || null,
        supports: data.supports || null,
        transportation: data.transportation || null,
        communication: data.communication || null,
        current_goals: data.current_goals || null,
        family_concerns: data.family_concerns || null,
        student_voice: data.student_voice || null,
        family_voice: data.family_voice || null,
        educator_input: data.educator_input || null,
      })
      .select("id")
      .single();

    if (intakeErr || !intake) {
      console.error("intake insert failed", intakeErr);
      throw new Error("Could not save your intake. Please try again.");
    }

    const model = "google/gemini-2.5-pro";
    const gateway = createLovableAiGatewayProvider(apiKey);

    let report: PathwayReport;
    try {
      const { experimental_output } = await generateText({
        model: gateway(model),
        experimental_output: Output.object({ schema: ReportSchema }),
        prompt: buildPrompt(data),
      });
      report = experimental_output as PathwayReport;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("AI generation failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't generate the Pathway Report. Please try again.");
    }

    const { data: saved, error: reportErr } = await supabase
      .from("pathway_reports")
      .insert({
        user_id: userId,
        intake_id: intake.id,
        model,
        content: JSON.parse(JSON.stringify(report)),
      })
      .select("id")
      .single();

    if (reportErr || !saved) {
      console.error("report insert failed", reportErr);
      throw new Error("Generated the report but couldn't save it. Please try again.");
    }

    return { reportId: saved.id, intakeId: intake.id, report };
  });

export type ReportListRow = {
  id: string;
  created_at: string;
  student_first_name: string;
  grade_band: string | null;
  summary: string | null;
  student_id: string | null;
  linked_student_name: string | null;
};

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("pathway_reports")
      .select(
        "id, created_at, intake_id, student_id, content, student_intakes(student_first_name, grade_band)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("listMyReports failed", error);
      return { reports: [] as ReportListRow[] };
    }
    type Row = {
      id: string;
      created_at: string;
      intake_id: string;
      student_id: string | null;
      content: { summary?: string } | null;
      student_intakes: { student_first_name: string; grade_band: string | null } | null;
    };
    const rows = (data ?? []) as unknown as Row[];

    // Resolve linked student names in a single follow-up query.
    const studentIds = Array.from(
      new Set(rows.map((r) => r.student_id).filter((x): x is string => !!x)),
    );
    const studentNameMap = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: studs } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .in("id", studentIds);
      for (const s of studs ?? []) {
        studentNameMap.set(
          (s as { id: string }).id,
          `${(s as { first_name: string }).first_name}${
            (s as { last_name: string | null }).last_name
              ? " " + (s as { last_name: string }).last_name
              : ""
          }`,
        );
      }
    }

    const reports: ReportListRow[] = rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      student_first_name: r.student_intakes?.student_first_name ?? "—",
      grade_band: r.student_intakes?.grade_band ?? null,
      summary: r.content?.summary ?? null,
      student_id: r.student_id,
      linked_student_name: r.student_id ? studentNameMap.get(r.student_id) ?? null : null,
    }));
    return { reports };
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("pathway_reports")
      .select("id, created_at, content, intake_id, student_id, student_intakes(student_first_name, grade_band)")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) {
      console.error("getReport failed", error);
      throw new Error("Report not found.");
    }
    type Row = {
      id: string;
      created_at: string;
      content: unknown;
      intake_id: string;
      student_id: string | null;
      student_intakes: { student_first_name: string; grade_band: string | null } | null;
    };
    const r = row as unknown as Row;
    return {
      id: r.id,
      created_at: r.created_at,
      student_id: r.student_id,
      student_first_name: r.student_intakes?.student_first_name ?? "—",
      grade_band: r.student_intakes?.grade_band ?? null,
      report: r.content as PathwayReport,
    };
  });

export const linkReportToStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        report_id: z.string().uuid(),
        student_id: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("pathway_reports")
      .update({ student_id: data.student_id })
      .eq("id", data.report_id);
    if (error) {
      console.error("linkReportToStudent failed", error);
      throw new Error("Could not link this report.");
    }
    return { ok: true };
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("pathway_reports").delete().eq("id", data.id);
    if (error) {
      console.error("deleteReport failed", error);
      throw new Error("Could not delete this report.");
    }
    return { ok: true };
  });

// ============================================================
// Phase 5 — Version history & meeting-prep linkage
// ============================================================

export type ReportVersionRow = {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
  created_by: string | null;
};

/**
 * Update a saved Pathway Report's content and snapshot the previous
 * content into pathway_report_versions. Only the report owner can update.
 */
export const updateReportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        report_id: z.string().uuid(),
        content: z.unknown(),
        change_summary: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: current, error: curErr } = await supabase
      .from("pathway_reports")
      .select("id, user_id, content")
      .eq("id", data.report_id)
      .maybeSingle();
    if (curErr || !current) throw new Error("Report not found.");
    if ((current as { user_id: string }).user_id !== userId) {
      throw new Error("You don't have permission to edit this report.");
    }

    // Compute next version number from existing snapshots.
    const { data: maxRow } = await supabase
      .from("pathway_report_versions")
      .select("version_number")
      .eq("report_id", data.report_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion =
      ((maxRow as { version_number: number } | null)?.version_number ?? 0) + 1;

    // Snapshot the CURRENT content as the new version row before overwriting.
    // For v2 → v2 transitions, auto-fill change_summary from the input manifest diff
    // when the caller didn't provide one.
    let summary = data.change_summary || null;
    if (!summary) {
      const prevContent = (current as { content: unknown }).content;
      if (isV2(prevContent) && isV2(data.content)) {
        const prevInputs =
          (prevContent as { inputs_used?: InputsUsed }).inputs_used;
        const nextInputs =
          (data.content as { inputs_used?: InputsUsed }).inputs_used;
        if (nextInputs) summary = diffInputsForChangeSummary(prevInputs, nextInputs);
      }
    }
    const { error: vErr } = await supabase
      .from("pathway_report_versions")
      .insert({
        report_id: data.report_id,
        version_number: nextVersion,
        content: JSON.parse(JSON.stringify((current as { content: unknown }).content ?? {})),
        change_summary: summary,
        created_by: userId,
      });

    if (vErr) {
      console.error("version snapshot failed", vErr);
      throw new Error("Could not save a version snapshot.");
    }

    const { error: upErr } = await supabase
      .from("pathway_reports")
      .update({ content: JSON.parse(JSON.stringify(data.content)) })
      .eq("id", data.report_id);
    if (upErr) {
      console.error("report content update failed", upErr);
      throw new Error("Could not save the report.");
    }

    return { ok: true, version_number: nextVersion };
  });

export const listReportVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ report_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("pathway_report_versions")
      .select("id, version_number, change_summary, created_at, created_by")
      .eq("report_id", data.report_id)
      .order("version_number", { ascending: false })
      .limit(50);
    if (error) {
      console.error("listReportVersions failed", error);
      return { versions: [] as ReportVersionRow[] };
    }
    return { versions: (rows ?? []) as ReportVersionRow[] };
  });

export const getReportVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ version_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("pathway_report_versions")
      .select("id, report_id, version_number, content, created_at, change_summary")
      .eq("id", data.version_id)
      .maybeSingle();
    if (error || !row) throw new Error("Version not found.");
    return {
      id: row.id,
      report_id: (row as { report_id: string }).report_id,
      version_number: (row as { version_number: number }).version_number,
      created_at: (row as { created_at: string }).created_at,
      change_summary: (row as { change_summary: string | null }).change_summary,
      content: (row as { content: unknown }).content as PathwayReport,
    };
  });

/**
 * Latest Pathway Report linked to a given student (RLS scopes to owner).
 * Used by Meeting Prep to surface the freshest report for a student.
 */
export const getLatestReportForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("pathway_reports")
      .select("id, created_at, content")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("getLatestReportForStudent failed", error);
      return { report: null };
    }
    if (!row) return { report: null };
    const r = row as { id: string; created_at: string; content: unknown };
    const content = r.content as Partial<PathwayReport> | null;
    return {
      report: {
        id: r.id,
        created_at: r.created_at,
        summary: content?.summary ?? null,
      },
    };
  });

