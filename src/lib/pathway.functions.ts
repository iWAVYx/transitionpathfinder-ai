import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireFeatureEntitlement } from "./entitlement-guard";
import {
  PathwayReportV2,
  computeDeterministicGaps,
  diffInputsForChangeSummary,
  isV2,
  type InputsUsed,
} from "./pathway-v2";
import {
  BANNED_SUMMARY_PHRASES,
  formatEvidenceForPrompt,
  isWeakSummary,
  summarizeEvidenceUsed,
  type EvidenceRow,
} from "./pathway-evidence";


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
  // Phase 1 — extended intake fields
  communication_prefs: z.string().trim().max(1000).optional().default(""),
  transportation_needs: z.string().trim().max(1000).optional().default(""),
  family_priorities: z.string().trim().max(2000).optional().default(""),
  family_concerns_extended: z.string().trim().max(2000).optional().default(""),
  student_worries: z.string().trim().max(2000).optional().default(""),
  services_received: z.string().trim().max(2000).optional().default(""),
  desired_postsecondary_outcomes: z.string().trim().max(2000).optional().default(""),
  upcoming_meetings: z.string().trim().max(1000).optional().default(""),
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

CONTEXT FROM EXTENDED INTAKE
Communication preferences: ${intake.communication_prefs || "(not provided)"}
Transportation needs: ${intake.transportation_needs || "(not provided)"}
Family priorities for postsecondary life: ${intake.family_priorities || "(not provided)"}
Family concerns (detailed): ${intake.family_concerns_extended || "(not provided)"}
What the student is worried about: ${intake.student_worries || "(not provided)"}
Services currently received: ${intake.services_received || "(not provided)"}
Desired postsecondary outcomes: ${intake.desired_postsecondary_outcomes || "(not provided)"}
Upcoming meetings / deadlines: ${intake.upcoming_meetings || "(not provided)"}

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
    await requireFeatureEntitlement(supabase, userId, "family");



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
        communication_prefs: data.communication_prefs || null,
        transportation_needs: data.transportation_needs || null,
        family_priorities: data.family_priorities || null,
        family_concerns_extended: data.family_concerns_extended || null,
        student_worries: data.student_worries || null,
        services_received: data.services_received || null,
        desired_postsecondary_outcomes: data.desired_postsecondary_outcomes || null,
        upcoming_meetings: data.upcoming_meetings || null,
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
      .select(
        "id, created_at, content, intake_id, student_id, review_date, student_intakes(student_first_name, grade_band)",
      )
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
      review_date: string | null;
      student_intakes: { student_first_name: string; grade_band: string | null } | null;
    };
    const r = row as unknown as Row;
    return {
      id: r.id,
      created_at: r.created_at,
      student_id: r.student_id,
      student_first_name: r.student_intakes?.student_first_name ?? "—",
      grade_band: r.student_intakes?.grade_band ?? null,
      review_date: r.review_date,
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

// ============================================================
// Pathway Report v2 — regenerate from a linked student's full data
// ============================================================

const REGEN_MODEL = "google/gemini-2.5-pro";

type V2Ctx = {
  student: {
    id: string;
    first_name: string;
    last_name: string | null;
    grade_band: string | null;
    interests: string[] | null;
    strengths: string[] | null;
    needs: string[] | null;
  };
  intake: Record<string, unknown> | null;
  voice: Array<{ prompt_key: string; response_text: string }>;
  goals: Array<{ id: string; area: string | null; goal_text: string | null; status: string | null }>;
  readiness: Array<{ category: string; score: number | null; updated_at: string | null }>;
  iep_docs: Array<{ id: string; doc_type: string; title: string | null; created_at: string }>;
  iep_extractions: Array<{ id: string; document_id: string; goals_identified: unknown; accommodations: unknown }>;
  saved_resources: Array<{ id: string; resource_id: string; title: string | null }>;
  resource_recs: Array<{ id: string; resource_id: string; reason: string | null }>;
  partner_matches: Array<{ id: string; opportunity_id: string | null; status: string | null }>;
  saved_partners: Array<{ id: string; partner_id: string | null; opportunity_id: string | null }>;
  action_items: Array<{ id: string; title: string; status: string | null }>;
  meeting_preps: Array<{ id: string; created_at: string; topics: unknown }>;
  evidence: EvidenceRow[];
};

function buildV2Prompt(ctx: V2Ctx): string {
  const s = ctx.student;
  const safe = (v: unknown) => (v === null || v === undefined ? "(none)" : JSON.stringify(v).slice(0, 1600));
  return `You are TransitionForward, generating the v2 Pathway Report — the platform's flagship deliverable.

Voice: warm, plain-language, 7th-grade reading level, never clinical, never generic. Honor the student's voice above all.

Generate the v2 additive sections ONLY. Schema is enforced. EVERY recommendation must include:
- title, summary, why, sources[], next_action, owner_role, discuss_at_next_meeting (boolean).
- sources[] must cite the actual inputs below using { kind, id?, label }. Use kind values: profile, student_voice, iep_doc, iep_extraction, goal, readiness, action_item, meeting_prep, saved_resource, partner_match, family_priority, educator_input.
- If you cannot cite a real input, do NOT invent the recommendation.
- timeframe is optional but encouraged ('30_day' | '90_day' | '6_month' | '1_year').

Provide between 2 and 5 recommendations in EACH of the four pillars:
- postsecondary_education_recs
- employment_pathway_recs
- independent_living_recs
- community_participation_recs

For audience_messages, write a short paragraph (1-3 sentences) per section per audience that frames what that section means for THAT reader. Use second person for student ('you'), third for educator ('the team').

For action plans (student / family / educator), populate Horizons with 1-4 concrete items per timeframe (30/90 day, 6 month, 1 year). Be specific. Address the student plan to the student in 'you' voice.

For meeting_prep_questions, provide 5-12 questions to bring to the next PPT/IEP. Tag each with for_audience ('student' | 'family' | 'educator' | 'team').

For iep_plan_summary: ONLY populate if iep_extractions has real data. Otherwise omit. plain_language per goal is required.

cross_cutting_horizons summarizes the most important moves overall.

inputs_used: reflect the manifest you actually drew from. Do NOT fabricate IDs.

ALSO populate these v2.1 additive blocks (all optional — omit any you cannot ground in the inputs):
- student_snapshot: { headline (1 warm sentence framing where this student is right now) }. Do NOT invent grade/age/school/district/case_manager — leave those out; the server fills them from the profile.
- spin: { strengths[], preferences[], interests[], needs[] } — short noun phrases, deduped, grounded in profile + student voice + IEP extractions. Skip arrays you cannot ground.
- readiness_indicators: omit — the server computes these deterministically from readiness_scores.
- confidence: { overall: 'low'|'medium'|'high', rationale (1 sentence), caveats[] (1-4 short notes about what's thin). Base 'overall' on how many of the manifest inputs are present.
- needs_review_flags: 1-6 items flagging sections that need human review (e.g. AI-extracted IEP goals, gaps in student voice). Each: { section, reason, owner_role? }.
- plain_language_summary: 2-4 sentence summary written FOR THE FAMILY/STUDENT at a 6th-grade level, warm and concrete.
- professional_summary: 2-4 sentence summary written FOR EDUCATORS using transition-planning language (Indicator 13-adjacent), still plain but precise.
Do NOT populate 'change_summary' — the server fills it from the input-manifest diff.

STUDENT
First name: ${s.first_name}
Grade band: ${s.grade_band ?? "(unknown)"}
Interests (profile): ${safe(s.interests)}
Strengths (profile): ${safe(s.strengths)}
Needs (profile): ${safe(s.needs)}

STUDENT VOICE (the student's own words)
${ctx.voice.length === 0 ? "(no responses on file)" : ctx.voice.map((v) => `- [${v.prompt_key}] ${v.response_text}`).join("\n")}

TRANSITION GOALS (from profile)
${ctx.goals.length === 0 ? "(no goals on file)" : ctx.goals.map((g) => `- [id:${g.id}] [${g.area ?? "—"}] ${g.goal_text ?? ""} (status: ${g.status ?? "—"})`).join("\n")}

READINESS SCORES
${ctx.readiness.length === 0 ? "(no readiness scores)" : ctx.readiness.map((r) => `- ${r.category}: ${r.score ?? "—"} (updated ${r.updated_at ?? "?"})`).join("\n")}

IEP DOCUMENTS ON FILE
${ctx.iep_docs.length === 0 ? "(none)" : ctx.iep_docs.map((d) => `- [id:${d.id}] ${d.doc_type}: ${d.title ?? "(untitled)"} (uploaded ${d.created_at})`).join("\n")}

IEP EXTRACTIONS (AI-parsed; verify before formal use)
${ctx.iep_extractions.length === 0 ? "(none)" : ctx.iep_extractions.map((e) => `- [id:${e.id}] doc:${e.document_id} goals:${safe(e.goals_identified)} accommodations:${safe(e.accommodations)}`).join("\n")}

INTAKE (last submitted)
${safe(ctx.intake)}

SAVED RESOURCES
${ctx.saved_resources.length === 0 ? "(none)" : ctx.saved_resources.map((r) => `- [id:${r.id}] resource:${r.resource_id} ${r.title ?? ""}`).join("\n")}

RESOURCE RECOMMENDATIONS (already on file)
${ctx.resource_recs.length === 0 ? "(none)" : ctx.resource_recs.map((r) => `- [id:${r.id}] resource:${r.resource_id} reason:${r.reason ?? ""}`).join("\n")}

PARTNER / OPPORTUNITY MATCHES
${ctx.partner_matches.length === 0 ? "(none)" : ctx.partner_matches.map((m) => `- [id:${m.id}] opportunity:${m.opportunity_id ?? "—"} status:${m.status ?? "—"}`).join("\n")}

SAVED PARTNERS
${ctx.saved_partners.length === 0 ? "(none)" : ctx.saved_partners.map((m) => `- [id:${m.id}] partner:${m.partner_id ?? "—"} opportunity:${m.opportunity_id ?? "—"}`).join("\n")}

OPEN ACTION ITEMS
${ctx.action_items.length === 0 ? "(none)" : ctx.action_items.map((a) => `- [id:${a.id}] ${a.title} (${a.status ?? "open"})`).join("\n")}

MEETING PREP HISTORY (most recent first)
${ctx.meeting_preps.length === 0 ? "(none)" : ctx.meeting_preps.map((m) => `- [id:${m.id}] ${m.created_at} topics:${safe(m.topics)}`).join("\n")}

EVIDENCE LINKS (previously mapped from documents, notes, and intake — prefer wording grounded in these)
${formatEvidenceForPrompt(ctx.evidence)}

Do NOT use these banned filler phrases in plain_language_summary or professional_summary: ${BANNED_SUMMARY_PHRASES.map((p) => `"${p}"`).join(", ")}. Every summary must be at least 60 characters, grounded in the inputs, and specific to this student.

Return ONLY the v2 schema JSON.`;
}

export const regeneratePathwayReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ report_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");
    const { supabase, userId } = context;
    await requireFeatureEntitlement(supabase, userId, "family");


    // Load report + verify ownership + linked student
    const { data: report, error: rErr } = await supabase
      .from("pathway_reports")
      .select("id, user_id, student_id, content, intake_id")
      .eq("id", data.report_id)
      .maybeSingle();
    if (rErr || !report) throw new Error("Report not found.");
    const rep = report as {
      id: string;
      user_id: string;
      student_id: string | null;
      content: unknown;
      intake_id: string | null;
    };
    if (rep.user_id !== userId) throw new Error("You don't have permission to regenerate this report.");
    if (!rep.student_id)
      throw new Error("Link this report to a student first — then regenerate to pull their full profile.");

    // Gather inputs (RLS scopes everything to the caller; failures are tolerated per-table)
    const [
      studentRes,
      intakeRes,
      voiceRes,
      goalsRes,
      readinessRes,
      docsRes,
      extractionsRes,
      savedResRes,
      resRecsRes,
      partnerMatchesRes,
      savedPartnersRes,
      actionsRes,
      prepsRes,
      evidenceRes,
    ] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name, grade_band, interests, strengths, needs").eq("id", rep.student_id).maybeSingle(),
      rep.intake_id
        ? supabase.from("student_intakes").select("*").eq("id", rep.intake_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("student_voice_responses").select("prompt_key, response_text").eq("student_id", rep.student_id),
      supabase.from("goals").select("id, area, goal_text, status").eq("student_id", rep.student_id).limit(40),
      supabase.from("readiness_scores").select("category, score, updated_at").eq("student_id", rep.student_id).limit(40),
      supabase.from("documents").select("id, doc_type, title, created_at").eq("student_id", rep.student_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("document_extractions").select("id, document_id, goals_identified, accommodations").eq("student_id", rep.student_id).limit(20),
      supabase.from("saved_resources").select("id, resource_id").eq("user_id", userId).limit(60),
      supabase.from("student_resource_recommendations").select("id, resource_id, reason").eq("student_id", rep.student_id).limit(40),
      supabase.from("student_opportunity_matches").select("id, opportunity_id, status").eq("student_id", rep.student_id).limit(40),
      supabase.from("student_saved_partners").select("id, partner_id, opportunity_id").eq("student_id", rep.student_id).limit(40),
      supabase.from("action_items").select("id, title, status").eq("student_id", rep.student_id).limit(40),
      supabase.from("ppt_meeting_preps").select("id, created_at").eq("student_id", rep.student_id).order("created_at", { ascending: false }).limit(10),
      supabase
        .from("report_evidence_links")
        .select("id, report_section, source_kind, source_id, source_label, note")
        .eq("student_id", rep.student_id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const student = studentRes.data as V2Ctx["student"] | null;
    if (!student) throw new Error("Couldn't load the linked student.");

    const ctx: V2Ctx = {
      student: { ...student, interests: (student.interests as unknown as string[] | null) ?? null, strengths: (student.strengths as unknown as string[] | null) ?? null, needs: (student.needs as unknown as string[] | null) ?? null },
      intake: (intakeRes.data as Record<string, unknown> | null) ?? null,
      voice: ((voiceRes.data as Array<{ prompt_key: string; response_text: string }> | null) ?? []),
      goals: ((goalsRes.data as Array<{ id: string; area: string | null; goal_text: string | null; status: string | null }> | null) ?? []),
      readiness: ((readinessRes.data as Array<{ category: string; score: number | null; updated_at: string | null }> | null) ?? []),
      iep_docs: ((docsRes.data as Array<{ id: string; doc_type: string; title: string | null; created_at: string }> | null) ?? []).filter((d) => /iep|transition/i.test(d.doc_type ?? "")),
      iep_extractions: ((extractionsRes.data as Array<{ id: string; document_id: string; goals_identified: unknown; accommodations: unknown }> | null) ?? []),
      saved_resources: ((savedResRes.data as Array<{ id: string; resource_id: string }> | null) ?? []).map((r) => ({ ...r, title: null })),
      resource_recs: ((resRecsRes.data as Array<{ id: string; resource_id: string; reason: string | null }> | null) ?? []),
      partner_matches: ((partnerMatchesRes.data as Array<{ id: string; opportunity_id: string | null; status: string | null }> | null) ?? []),
      saved_partners: ((savedPartnersRes.data as Array<{ id: string; partner_id: string | null; opportunity_id: string | null }> | null) ?? []),
      action_items: ((actionsRes.data as Array<{ id: string; title: string; status: string | null }> | null) ?? []),
      meeting_preps: ((prepsRes.data as Array<{ id: string; created_at: string }> | null) ?? []).map((p) => ({ ...p, topics: null })),
      evidence: ((evidenceRes.data as EvidenceRow[] | null) ?? []),
    };

    // Build the deterministic input manifest BEFORE we ask the AI.
    const inputs_used: InputsUsed = {
      profile: true,
      intake: !!ctx.intake,
      student_voice_keys: ctx.voice.map((v) => v.prompt_key),
      iep_doc_ids: ctx.iep_docs.map((d) => d.id),
      iep_extraction_ids: ctx.iep_extractions.map((e) => e.id),
      goal_ids: ctx.goals.map((g) => g.id),
      readiness_at: ctx.readiness[0]?.updated_at ?? undefined,
      readiness_category_count: ctx.readiness.length,
      action_item_ids: ctx.action_items.map((a) => a.id),
      meeting_prep_ids: ctx.meeting_preps.map((m) => m.id),
      saved_resource_ids: ctx.saved_resources.map((r) => r.id),
      partner_match_ids: ctx.partner_matches.map((m) => m.id),
      generated_at: new Date().toISOString(),
    };

    // Ask the AI for the v2 spine
    const gateway = createLovableAiGatewayProvider(apiKey);
    let v2: z.infer<typeof PathwayReportV2>;
    try {
      const { experimental_output } = await generateText({
        model: gateway(REGEN_MODEL),
        experimental_output: Output.object({ schema: PathwayReportV2 }),
        prompt: buildV2Prompt(ctx),
      });
      v2 = experimental_output as z.infer<typeof PathwayReportV2>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("v2 regeneration failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't regenerate the report. Please try again.");
    }

    // Merge deterministic gaps with any AI-suggested gaps (dedupe by topic).
    const determined = computeDeterministicGaps(inputs_used);
    const aiGaps = v2.missing_information_v2 ?? [];
    const seen = new Set(aiGaps.map((g) => g.topic.toLowerCase()));
    const mergedGaps = [...aiGaps, ...determined.filter((g) => !seen.has(g.topic.toLowerCase()))];

    // Deterministic v2.1 backfills — never trust the AI for grounded facts.
    const scoreToLevel = (s: number | null): "emerging" | "developing" | "progressing" | "ready" => {
      const n = s ?? 0;
      if (n >= 76) return "ready";
      if (n >= 51) return "progressing";
      if (n >= 26) return "developing";
      return "emerging";
    };
    const readiness_indicators = ctx.readiness
      .filter((r) => !!r.category)
      .slice(0, 20)
      .map((r) => ({
        domain: r.category,
        level: scoreToLevel(r.score),
        note: r.score != null ? `Score ${r.score}/100` : undefined,
      }));

    const aiSnapshot = v2.student_snapshot ?? {};
    const student_snapshot = {
      ...aiSnapshot,
      display_name: [ctx.student.first_name, ctx.student.last_name].filter(Boolean).join(" ") || aiSnapshot.display_name,
      grade: ctx.student.grade_band ?? aiSnapshot.grade,
      last_updated: new Date().toISOString().slice(0, 10),
    };

    // --- v2.1 deterministic backfills (grounding > AI guesses) ---
    // Confidence: clamp AI 'overall' against actual input completeness.
    const inputSignals = [
      true, // profile always present
      !!ctx.intake,
      ctx.voice.length > 0,
      ctx.iep_docs.length > 0,
      ctx.iep_extractions.length > 0,
      ctx.goals.length > 0,
      ctx.readiness.length > 0,
    ];
    const signalRatio = inputSignals.filter(Boolean).length / inputSignals.length;
    const computedOverall: "low" | "medium" | "high" =
      signalRatio >= 0.75 ? "high" : signalRatio >= 0.45 ? "medium" : "low";
    const aiConfidence = v2.confidence;
    const order = { low: 0, medium: 1, high: 2 } as const;
    const overall: "low" | "medium" | "high" =
      aiConfidence?.overall && order[aiConfidence.overall] <= order[computedOverall]
        ? aiConfidence.overall
        : computedOverall;
    const baseCaveats: string[] = [];
    if (ctx.voice.length === 0) baseCaveats.push("No student voice responses on file.");
    if (ctx.iep_docs.length === 0) baseCaveats.push("No IEP or transition document uploaded.");
    if (ctx.iep_extractions.length === 0 && ctx.iep_docs.length > 0)
      baseCaveats.push("IEP uploaded but not yet extracted — some sections may be thin.");
    if (ctx.readiness.length === 0) baseCaveats.push("No readiness scores yet.");
    const mergedCaveats = Array.from(
      new Set([...(aiConfidence?.caveats ?? []), ...baseCaveats]),
    ).slice(0, 8);
    const confidence = {
      overall,
      rationale:
        aiConfidence?.rationale ??
        `Based on ${inputSignals.filter(Boolean).length} of ${inputSignals.length} expected inputs.`,
      caveats: mergedCaveats.length > 0 ? mergedCaveats : undefined,
    };

    // needs_review_flags: ensure baseline flags for known gaps.
    const baseFlags: Array<{ section: string; reason: string; owner_role?: string }> = [];
    if (ctx.iep_extractions.length > 0)
      baseFlags.push({
        section: "iep_summary",
        reason: "AI-extracted IEP content — verify goals, services, and accommodations with the team.",
        owner_role: "case_manager",
      });
    if (ctx.voice.length === 0)
      baseFlags.push({
        section: "student_voice",
        reason: "No Student Voice responses on file — please capture before the next meeting.",
        owner_role: "student",
      });
    if (ctx.readiness.length === 0)
      baseFlags.push({
        section: "readiness_indicators",
        reason: "Readiness scores have not been entered — indicators are placeholders.",
        owner_role: "case_manager",
      });
    const aiFlags = v2.needs_review_flags ?? [];
    const seenFlagKeys = new Set(aiFlags.map((f) => f.section.toLowerCase()));
    const needs_review_flags = [
      ...aiFlags,
      ...baseFlags.filter((f) => !seenFlagKeys.has(f.section.toLowerCase())),
    ].slice(0, 20);

    // SPIN backfill from profile when AI returns nothing usable.
    const cleanList = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? arr
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter((s) => s.length > 0 && s.length < 200)
            .slice(0, 8)
        : [];
    const aiSpin = v2.spin ?? {};
    const spin = {
      strengths: aiSpin.strengths?.length ? aiSpin.strengths : cleanList(ctx.student.strengths),
      preferences: aiSpin.preferences,
      interests: aiSpin.interests?.length ? aiSpin.interests : cleanList(ctx.student.interests),
      needs: aiSpin.needs?.length ? aiSpin.needs : cleanList(ctx.student.needs),
    };

    // Plain-language + professional summary fallbacks.
    const studentName = ctx.student.first_name ?? "this student";
    const topInterest = spin.interests?.[0];
    const topStrength = spin.strengths?.[0];
    const plain_language_summary =
      v2.plain_language_summary?.trim() ||
      `This report gathers what we know about ${studentName} and turns it into next steps the family and team can act on.${
        topStrength ? ` ${studentName}'s strengths include ${topStrength}.` : ""
      }${topInterest ? ` Interests like ${topInterest} are shaping the recommended pathways.` : ""} Review the flagged sections with the team before the next meeting.`;
    const professional_summary =
      v2.professional_summary?.trim() ||
      `Synthesized from ${inputSignals.filter(Boolean).length}/${inputSignals.length} input sources (profile, intake, student voice, IEP docs, extractions, goals, readiness). Confidence: ${overall}. ${baseCaveats[0] ?? "Use as supportive planning input alongside team judgment and Indicator 13 requirements."}`;

    // Build the next content payload: keep legacy v1 fields, graft v2 on top.
    const prevContent =
      typeof rep.content === "object" && rep.content !== null
        ? (rep.content as Record<string, unknown>)
        : {};

    const prevInputs = isV2(prevContent)
      ? (prevContent as { inputs_used?: InputsUsed }).inputs_used
      : undefined;
    const change_summary = diffInputsForChangeSummary(prevInputs, inputs_used);

    const nextContent: Record<string, unknown> = {
      ...prevContent,
      ...v2,
      schema_version: 2,
      missing_information_v2: mergedGaps,
      inputs_used,
      student_snapshot,
      readiness_indicators: readiness_indicators.length > 0 ? readiness_indicators : v2.readiness_indicators,
      spin,
      confidence,
      needs_review_flags,
      plain_language_summary,
      professional_summary,
      change_summary,
    };


    // Snapshot + overwrite via updateReportContent path (manual to avoid round-trip).
    const { data: maxRow } = await supabase
      .from("pathway_report_versions")
      .select("version_number")
      .eq("report_id", rep.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion =
      ((maxRow as { version_number: number } | null)?.version_number ?? 0) + 1;


    const { error: vErr } = await supabase
      .from("pathway_report_versions")
      .insert({
        report_id: rep.id,
        version_number: nextVersion,
        content: JSON.parse(JSON.stringify(prevContent)),
        change_summary,
        created_by: userId,
      });
    if (vErr) {
      console.error("regen version snapshot failed", vErr);
      throw new Error("Could not save a version snapshot.");
    }

    const { error: upErr } = await supabase
      .from("pathway_reports")
      .update({ content: JSON.parse(JSON.stringify(nextContent)) })
      .eq("id", rep.id);
    if (upErr) {
      console.error("regen content write failed", upErr);
      throw new Error("Could not save the regenerated report.");
    }

    return {
      ok: true as const,
      version_number: nextVersion,
      change_summary,
      gaps_count: mergedGaps.length,
    };
  });

