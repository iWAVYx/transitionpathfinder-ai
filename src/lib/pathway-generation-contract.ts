import { z } from "zod";

export const IntakeSchema = z.object({
  student_id: z.string().uuid().optional(),
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1).max(80),
  grade_band: z.enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
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

export const ReportSchema = z.object({
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
        goal_text: z.string().trim().min(1),
        plain_meaning: z.string(),
        connected_services: z
          .array(z.string().trim().min(1))
          .max(4)
          .describe("Only services explicitly supplied in the intake; use an empty array when no connected service is documented."),
        questions_to_ask: z.array(z.string().trim().min(1)).min(1).max(4),
        what_student_should_know: z.string(),
        connected_to_real_life: z.string(),
        missing_information: z.array(z.string()).max(4),
      }),
    )
    .min(1)
    .max(6)
    .optional()
    .describe("Translate only actual IEP goal text supplied in the intake. Omit this section when no actual goal text is available; never invent or duplicate goals to fill the array."),

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

export function buildPrompt(intake: IntakeInput) {
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

Fill every required top-level field of the schema. Include optional sections only when there is a supported basis in the intake. The schema is large on purpose. Be specific, not exhaustive — short, concrete bullets are better than long abstract ones. Use Connecticut-aware language (CT community colleges, CT technical high schools, Bureau of Rehabilitation Services / BRS, DDS, Level Up) when reasonable, but never invent specific program names you cannot verify.

Guidance for major sections:
- student_snapshot: warm hero card. readiness_level is one of "emerging" | "developing" | "progressing" | "ready". student_voice_quote should sound like the student.
- spin_analysis: connect strengths → real pathways (e.g. hands-on → technical ed, trades, healthcare support, culinary, automotive). The what_this_means tie-back is required.
- postsecondary_goals: 4-11 areas drawn from Education/training, Employment, Independent living, Community participation, Self-advocacy, Transportation, Financial literacy, Daily living, Social/emotional readiness, Health/wellness, Technology/digital skills. measurable_goal_language must be a draftable IEP-style sentence.
- recommended_pathways: 3-5 pathways spanning best-fit / backup / exploration / stretch / support-needed.
- career_matches: 3-6 cluster cards.
- readiness_scorecard: 6-14 categories from Self-advocacy, Career awareness, Job readiness, Communication, Independent living, Transportation, Financial literacy, Postsecondary readiness, Technology, Executive functioning, Social skills, Community participation, Daily routines, Problem-solving. Be supportive — never harsh.
- iep_translator: translate only actual IEP goal text supplied in current_goals/intake. If no actual IEP goal text was supplied, omit this optional section and identify the missing IEP in data_gaps. Draft planning ideas, fictional observations, and statements that no IEP was supplied are not current IEP goals. If exactly one actual goal was supplied, return one translation. Include only explicitly supplied connected services; use an empty connected_services array when none are documented. Never invent or duplicate goals or services to fill an array. Flag missing information and keep draft recommendations clearly separate from existing IEP content.
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
