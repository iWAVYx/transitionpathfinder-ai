import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * GOLDEN PATH — Parent dashboard data + demo student seeder
 * ============================================================ */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type ActionItemRow = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: "family" | "student" | "teacher" | "school" | "partner";
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "complete" | "blocked";
  due_date: string | null;
  related_goal_area: string | null;
  pathway_report_id: string | null;
  created_at: string;
};

export type MeetingPrepRow = {
  id: string;
  meeting_id: string;
  student_id: string;
  category: string;
  content: string;
  completed: boolean;
};

export type ConsentRow = {
  id: string;
  student_id: string;
  consent_type: string;
  consent_status: string;
  granted_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  consent_text_snapshot: string;
};

export type DashboardSnapshot = {
  student: {
    id: string;
    first_name: string;
    last_name: string | null;
    preferred_name: string | null;
    grade_band: string | null;
    school: string | null;
    expected_graduation_year: number | null;
    strengths_summary: string | null;
    interests_summary: string | null;
    support_needs_summary: string | null;
    family_priorities: string | null;
    current_transition_status: string | null;
    readiness_level: string | null;
    student_voice_statement: string | null;
  } | null;
  latestReport: {
    id: string;
    created_at: string;
    content: Json;
  } | null;
  goals: Array<{ id: string; title: string; category: string; status: string }>;
  documents: Array<{
    id: string;
    title: string;
    doc_type: string;
    status: string;
    created_at: string;
  }>;
  actionItems: ActionItemRow[];
  upcomingMeeting: {
    id: string;
    title: string;
    kind: string;
    scheduled_at: string | null;
    location: string | null;
  } | null;
  meetingPrep: MeetingPrepRow[];
  recommendedResources: Array<{
    id: string;
    title: string;
    description: string | null;
    resource_type: string;
    topic: string | null;
    url: string | null;
    matched_reason: string;
    saved: boolean;
  }>;
  consents: ConsentRow[];
};

/* ---------- Dashboard snapshot ---------- */

export const getDashboardSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid().optional() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<DashboardSnapshot> => {
    const { supabase, userId } = context;

    let studentId = data.student_id ?? null;
    if (!studentId) {
      const { data: first } = await supabase
        .from("students")
        .select("id")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      studentId = (first as { id?: string } | null)?.id ?? null;
    }

    if (!studentId) {
      return {
        student: null,
        latestReport: null,
        goals: [],
        documents: [],
        actionItems: [],
        upcomingMeeting: null,
        meetingPrep: [],
        recommendedResources: [],
        consents: [],
      };
    }

    const [
      studentRes,
      reportRes,
      goalsRes,
      docsRes,
      actionsRes,
      meetingRes,
      consentsRes,
    ] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
      supabase
        .from("pathway_reports")
        .select("id, created_at, content")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("goals")
        .select("id, title, category, status")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true }),
      supabase
        .from("documents")
        .select("id, title, doc_type, status, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("action_items")
        .select("*")
        .eq("student_id", studentId)
        .order("priority", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("meetings")
        .select("id, title, kind, scheduled_at, location, status")
        .eq("student_id", studentId)
        .in("status", ["upcoming"])
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("consent_records")
        .select("*")
        .eq("student_id", studentId)
        .order("granted_at", { ascending: false }),
    ]);

    const upcomingMeeting = (meetingRes.data ?? null) as DashboardSnapshot["upcomingMeeting"];

    let meetingPrep: MeetingPrepRow[] = [];
    if (upcomingMeeting) {
      const { data: prep } = await supabase
        .from("meeting_prep_items")
        .select("id, meeting_id, student_id, category, content, completed")
        .eq("meeting_id", upcomingMeeting.id)
        .order("category", { ascending: true });
      meetingPrep = (prep ?? []) as MeetingPrepRow[];
    }

    // Recommended resources — match by topic against student interests/needs
    const student = studentRes.data as DashboardSnapshot["student"];
    const haystack = [
      student?.strengths_summary,
      student?.interests_summary,
      student?.support_needs_summary,
      student?.family_priorities,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const [{ data: allResources }, { data: savedRows }] = await Promise.all([
      supabase
        .from("resources")
        .select("id, title, description, resource_type, topic, url")
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("saved_resources")
        .select("resource_id")
        .eq("user_id", userId),
    ]);
    const savedIds = new Set(
      ((savedRows ?? []) as Array<{ resource_id: string }>).map((r) => r.resource_id),
    );

    const TOPIC_HINTS: Array<[string, string[]]> = [
      ["self-advocacy", ["advocate", "voice", "speak", "iep meeting"]],
      ["career exploration", ["career", "job", "work", "employ"]],
      ["independent living", ["independent", "living", "daily", "cook", "budget"]],
      ["transition planning", ["transition", "after high school", "graduation"]],
      ["agency support", ["brs", "ddss", "dds", "agency", "services"]],
      ["iep", ["iep", "goal", "504"]],
      ["meetings", ["ppt", "meeting", "prep"]],
      ["goals", ["goal"]],
    ];

    const recommendedResources = ((allResources ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      resource_type: string;
      topic: string | null;
      url: string | null;
    }>)
      .map((r) => {
        const topic = (r.topic ?? "").toLowerCase();
        const hints = TOPIC_HINTS.find(([t]) => t === topic)?.[1] ?? [];
        const matched = hints.some((h) => haystack.includes(h));
        return {
          ...r,
          matched_reason: matched
            ? `Matches ${student?.first_name ?? "this student"}'s ${topic}`
            : topic
              ? `Recommended for ${topic}`
              : "Suggested for transition planning",
          saved: savedIds.has(r.id),
          _score: matched ? 2 : 1,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 6)
      .map(({ _score, ...rest }) => rest);

    return {
      student,
      latestReport: (reportRes.data as DashboardSnapshot["latestReport"]) ?? null,
      goals: (goalsRes.data ?? []) as DashboardSnapshot["goals"],
      documents: (docsRes.data ?? []) as DashboardSnapshot["documents"],
      actionItems: (actionsRes.data ?? []) as ActionItemRow[],
      upcomingMeeting,
      meetingPrep,
      recommendedResources,
      consents: (consentsRes.data ?? []) as ConsentRow[],
    };
  });

/* ---------- Action item CRUD ---------- */



export const setActionItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["not_started", "in_progress", "complete", "blocked"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("action_items")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Could not update action item.");
    return { ok: true };
  });

/* ---------- Meeting prep persistence ---------- */

export const setMeetingPrepCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meeting_prep_items")
      .update({ completed: data.completed })
      .eq("id", data.id);
    if (error) throw new Error("Could not update prep item.");
    return { ok: true as const };
  });

/* ---------- Saved resources toggle ---------- */

export const toggleSavedResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ resource_id: z.string().uuid(), saved: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.saved) {
      const { data: existing } = await supabase
        .from("saved_resources")
        .select("id")
        .eq("user_id", userId)
        .eq("resource_id", data.resource_id)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase
          .from("saved_resources")
          .insert({ user_id: userId, resource_id: data.resource_id });
        if (error) throw new Error("Could not save resource.");
      }
    } else {
      const { error } = await supabase
        .from("saved_resources")
        .delete()
        .eq("user_id", userId)
        .eq("resource_id", data.resource_id);
      if (error) throw new Error("Could not remove saved resource.");
    }
    return { ok: true as const, saved: data.saved };
  });

/* ---------- Consent ---------- */

export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        consent_type: z.enum([
          "ai_processing",
          "team_sharing",
          "report_sharing",
          "document_storage",
        ]),
        consent_text_snapshot: z.string().min(1).max(2000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("consent_records").insert({
      student_id: data.student_id,
      consenting_user_id: userId,
      consent_type: data.consent_type,
      consent_status: "granted",
      consent_text_snapshot: data.consent_text_snapshot,
    });
    if (error) throw new Error("Could not record consent.");
    return { ok: true };
  });

export const revokeConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("consent_records")
      .update({ consent_status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Could not revoke consent.");
    return { ok: true };
  });


/* ---------- DEMO STUDENT SEEDER ---------- */

const DEMO_REPORT_CONTENT = {
  summary:
    "Marcus is a hands-on, kind-hearted 11th grader with a strong interest in working with his hands, helping people, and finding a steady path after high school. Build on his confidence and small wins.",
  student_snapshot: {
    grade_level: "11th grade",
    graduation_timeline: "Spring 2027",
    primary_interests: ["Automotive", "Helping others", "Sports", "Music"],
    learning_preferences: ["Hands-on tasks", "Visual demos", "1:1 check-ins"],
    communication_style: "Brief verbal answers, prefers texting reminders",
    current_transition_status: "Exploring career pathways, beginning self-advocacy work",
    readiness_level: "developing",
    family_priorities: ["Independence", "Steady employment", "Transportation"],
    student_voice_quote: "I want to fix things and have a real job after school.",
  },
  spin_analysis: {
    strengths: ["Mechanical reasoning", "Patience", "Kindness with peers", "Punctual"],
    preferences: ["Hands-on work", "Predictable routines", "Small teams"],
    interests: ["Cars", "Carpentry", "Helping younger students"],
    needs: ["Reading comprehension support", "Executive functioning scaffolds", "Self-advocacy practice"],
    motivators: ["Earning money", "Family pride", "Concrete progress"],
    barriers: ["Reading dense text", "Long unstructured tasks"],
    environmental_supports: ["Visual schedules", "Mentor check-ins"],
    areas_for_growth: ["Asking for help", "Time management"],
    what_this_means: "Pair Marcus with pathways that reward hands-on competence and offer steady mentorship.",
  },
  recommended_pathways: [
    {
      type: "best-fit",
      title: "Automotive Technology pathway",
      why_it_fits: "Marcus loves cars and learns best by doing.",
      related_strengths: ["Mechanical reasoning", "Patience"],
      possible_barriers: ["Reading service manuals"],
      supports_needed: ["Visual instructions", "Mentor"],
      school_experiences: ["Vo-Ag program tour", "Job shadow at local garage"],
      community_experiences: ["BRS pre-employment", "Summer internship"],
      courses_or_programs: ["Intro to Auto Tech", "Workplace Readiness"],
      career_clusters: ["Transportation", "Manufacturing"],
      credentials: ["ASE entry-level certificate"],
      partner_resources: ["CT Technical High School System"],
      action_steps: {
        thirty_day: ["Visit one auto program", "Talk to a tech at a local shop"],
        ninety_day: ["Apply to summer pre-employment"],
        six_month: ["Complete a job shadow"],
        one_year: ["Enroll in Intro to Auto Tech"],
      },
    },
  ],
  career_matches: [
    {
      cluster: "Transportation, Distribution & Logistics",
      example_jobs: ["Auto service tech", "Tire technician", "Parts associate"],
      skills_required: ["Mechanical aptitude", "Customer service"],
      education_needed: "High school + technical certificate",
      work_environment: "Garage, predictable schedule",
      accommodations: ["Visual checklists", "Mentor"],
      readiness_level: "developing",
      next_step: "Job shadow at a local garage",
    },
  ],
  readiness_scorecard: [
    { category: "Self-advocacy", level: "developing", evidence: "Beginning to ask teachers for help", what_it_means: "Growing comfort speaking up", growth_activity: "Practice in mock IEP meeting", suggested_goal: "Lead a portion of next PPT" },
    { category: "Career awareness", level: "progressing", evidence: "Names 3+ careers of interest", what_it_means: "Has direction to explore", growth_activity: "Job shadow", suggested_goal: "Complete 2 shadows this year" },
    { category: "Transportation", level: "emerging", evidence: "Does not yet ride bus independently", what_it_means: "Needs practice", growth_activity: "Travel training", suggested_goal: "Take 3 supervised bus trips" },
    { category: "Job readiness", level: "developing", evidence: "Reliable, polite, on time", what_it_means: "Strong foundation", growth_activity: "Resume building", suggested_goal: "Complete first resume" },
    { category: "Independent living", level: "developing", evidence: "Helps with cooking at home", what_it_means: "Building skills", growth_activity: "Budgeting practice", suggested_goal: "Manage $20 weekly budget" },
    { category: "Communication", level: "developing", evidence: "Texts reliably; brief verbally", what_it_means: "Use text-friendly tools", growth_activity: "Practice phone calls", suggested_goal: "Make 3 self-initiated calls" },
  ],
  iep_translator: [
    {
      goal_text: "Marcus will explore three career options and complete an interest inventory by spring.",
      plain_meaning: "Marcus will try out three career ideas and take a survey about what he likes.",
      connected_services: ["Transition coordinator support", "Career counseling"],
      questions_to_ask: ["Which inventory will be used?", "Who introduces the three options?"],
      what_student_should_know: "You get to help pick which careers to explore.",
      connected_to_real_life: "This sets up your summer internship choice.",
      missing_information: ["Specific dates for each step"],
    },
  ],
  data_gaps: [
    { item: "Updated transition assessment", why_it_matters: "Drives postsecondary goals", who_can_help: "Case manager", how_to_collect: "Request before next PPT", question_to_ask: "When was the last transition assessment?" },
    { item: "Vocational interest inventory", why_it_matters: "Confirms career direction", who_can_help: "School counselor", how_to_collect: "Schedule a session", question_to_ask: "Can Marcus take the inventory this month?" },
    { item: "BRS referral status", why_it_matters: "Unlocks adult services", who_can_help: "Transition coordinator", how_to_collect: "Ask at next PPT", question_to_ask: "Has the BRS referral been started?" },
  ],
  family_action_plan: {
    this_week: ["Read Pathway Report together", "Pick one career to explore"],
    this_month: ["Visit one technical school", "Practice riding the bus once"],
    before_next_meeting: ["List 3 questions for the team", "Save 2 resources"],
    this_school_year: ["Complete a job shadow", "Build a draft resume"],
    before_graduation: ["Complete a paid internship", "Connect with BRS"],
  },
  teacher_action_plan: {
    goal_updates: ["Review postsecondary goals at next PPT"],
    progress_monitoring: ["Track shadow completion"],
    assessments_to_run: ["Updated transition assessment"],
    classroom_activities: ["Self-advocacy role play"],
    family_communication: ["Weekly text update"],
    student_conference_questions: ["What part of school feels best?", "What's hard?"],
    service_connections: ["Initiate BRS referral"],
    accommodations: ["Visual checklists", "Extended time"],
    work_based_learning: ["Schedule one job shadow this quarter"],
  },
  meeting_prep_toolkit: {
    questions_to_ask: [
      "How is Marcus progressing on his transition goals?",
      "When will the next transition assessment happen?",
      "What work-based learning options are available?",
      "Has the BRS referral been initiated?",
    ],
    documents_to_bring: ["Pathway Report", "Most recent IEP", "Career inventory results"],
    concerns_to_raise: ["Reading support during work-based learning"],
    strengths_to_highlight: ["Reliability", "Mechanical aptitude", "Kindness"],
    goals_to_review: ["Career exploration goal", "Transportation goal"],
    services_to_discuss: ["BRS", "Job coach"],
    student_voice_prompts: ["What do I want to try next?"],
    follow_up_items: ["Confirm next assessment date", "Get BRS contact"],
  },
};

export const seedDemoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1. Student
    const { data: student, error: sErr } = await supabase
      .from("students")
      .insert({
        owner_id: userId,
        first_name: "Marcus",
        last_name: "Rivera",
        preferred_name: "Marcus",
        grade_band: "11-12",
        school: "Hartford Regional High School",
        expected_graduation_year: 2027,
        strengths_summary:
          "Hands-on learner, mechanical reasoning, patience, kindness with peers, reliable and on time.",
        interests_summary:
          "Automotive work, carpentry, helping younger students, sports, music.",
        support_needs_summary:
          "Reading comprehension support, executive functioning scaffolds, self-advocacy practice.",
        family_priorities:
          "Steady employment, independent living skills, reliable transportation, staying connected to family.",
        student_voice_statement:
          "I want to fix things and have a real job after school.",
        current_transition_status:
          "Exploring career pathways; beginning self-advocacy work.",
        readiness_level: "developing",
        notes: "Demo profile — use to explore TransitionForward features.",
      })
      .select("id")
      .single();
    if (sErr || !student) throw new Error(sErr?.message ?? "Could not create demo student.");
    const studentId = (student as { id: string }).id;

    // 2. Goals
    await supabase.from("goals").insert([
      { student_id: studentId, created_by: userId, title: "Complete a career interest inventory", category: "career", status: "in-progress" },
      { student_id: studentId, created_by: userId, title: "Visit one technical school program", category: "career", status: "not-started" },
      { student_id: studentId, created_by: userId, title: "Practice riding city bus with support", category: "transportation", status: "not-started" },
      { student_id: studentId, created_by: userId, title: "Lead a portion of next PPT meeting", category: "communication", status: "not-started" },
      { student_id: studentId, created_by: userId, title: "Build first draft resume", category: "career", status: "not-started" },
    ]);

    // 3. Documents (metadata-only demo records)
    await supabase.from("documents").insert([
      { student_id: studentId, uploaded_by: userId, title: "Current IEP (2025-2026).pdf", storage_path: `${studentId}/demo/iep-2025.pdf`, doc_type: "iep", document_category: "iep", status: "summarized", file_name: "iep-2025.pdf", mime_type: "application/pdf", size_bytes: 482104 },
      { student_id: studentId, uploaded_by: userId, title: "Transition assessment (2024).pdf", storage_path: `${studentId}/demo/transition-2024.pdf`, doc_type: "assessment", document_category: "transition_assessment", status: "summarized", file_name: "transition-2024.pdf", mime_type: "application/pdf", size_bytes: 201556 },
      { student_id: studentId, uploaded_by: userId, title: "Q1 progress report.pdf", storage_path: `${studentId}/demo/progress-q1.pdf`, doc_type: "progress", document_category: "progress_report", status: "needs_review", file_name: "progress-q1.pdf", mime_type: "application/pdf", size_bytes: 98232 },
      { student_id: studentId, uploaded_by: userId, title: "Career interest inventory results.pdf", storage_path: `${studentId}/demo/career-inv.pdf`, doc_type: "assessment", document_category: "career_inventory", status: "processing", file_name: "career-inv.pdf", mime_type: "application/pdf", size_bytes: 64320 },
      { student_id: studentId, uploaded_by: userId, title: "Family input form.pdf", storage_path: `${studentId}/demo/family-input.pdf`, doc_type: "family", document_category: "family_input", status: "uploaded", file_name: "family-input.pdf", mime_type: "application/pdf", size_bytes: 33112 },
    ]);

    // 4. Pathway report (intake_id is NOT NULL — create matching intake first)
    const { data: intake } = await supabase
      .from("student_intakes")
      .insert({
        user_id: userId,
        submitter_role: "family",
        student_first_name: "Marcus",
        grade_band: "11-12",
        strengths: "Hands-on, mechanical, patient, kind.",
        interests: "Automotive, carpentry, sports, music.",
        needs: "Reading comprehension, executive functioning, self-advocacy.",
        family_voice: "We want a steady job and independence.",
        student_voice: "I want to fix things and have a real job.",
        student_id: studentId,
      })
      .select("id")
      .single();
    const intakeId = (intake as { id: string } | null)?.id;
    let reportId: string | null = null;
    if (intakeId) {
      const { data: report } = await supabase
        .from("pathway_reports")
        .insert({
          user_id: userId,
          intake_id: intakeId,
          student_id: studentId,
          model: "demo/seed",
          content: DEMO_REPORT_CONTENT,
          executive_summary: DEMO_REPORT_CONTENT.summary,
        })
        .select("id")
        .maybeSingle();
      reportId = (report as { id?: string } | null)?.id ?? null;
    }

    // 5. Readiness scores
    await supabase.from("readiness_scores").insert(
      DEMO_REPORT_CONTENT.readiness_scorecard.map((r) => ({
        student_id: studentId,
        updated_by_user_id: userId,
        category: r.category,
        level_label: r.level,
        evidence: r.evidence,
        recommendation: r.growth_activity,
      })),
    );

    // 6. Action items
    await supabase.from("action_items").insert([
      { student_id: studentId, created_by_user_id: userId, title: "Complete career interest inventory", description: "Online survey, takes ~20 min.", category: "student", priority: "high", status: "in_progress", related_goal_area: "career", pathway_report_id: reportId },
      { student_id: studentId, created_by_user_id: userId, title: "Ask team about updated transition assessment", category: "family", priority: "high", status: "not_started", related_goal_area: "assessment", pathway_report_id: reportId },
      { student_id: studentId, created_by_user_id: userId, title: "Review employment goal at next PPT", category: "teacher", priority: "medium", status: "not_started", related_goal_area: "employment", pathway_report_id: reportId },
      { student_id: studentId, created_by_user_id: userId, title: "Visit one CT Technical High School program", category: "family", priority: "medium", status: "not_started", related_goal_area: "career", pathway_report_id: reportId },
      { student_id: studentId, created_by_user_id: userId, title: "Practice transportation planning together", category: "family", priority: "medium", status: "not_started", related_goal_area: "transportation", pathway_report_id: reportId },
      { student_id: studentId, created_by_user_id: userId, title: "Save three career resources to profile", category: "family", priority: "low", status: "not_started", related_goal_area: "career", pathway_report_id: reportId },
      { student_id: studentId, created_by_user_id: userId, title: "Prepare 3 questions for next PPT meeting", category: "family", priority: "high", status: "not_started", related_goal_area: "meetings", pathway_report_id: reportId },
    ]);

    // 7. Upcoming meeting + prep
    const meetingDate = new Date();
    meetingDate.setDate(meetingDate.getDate() + 14);
    const { data: meeting } = await supabase
      .from("meetings")
      .insert({
        student_id: studentId,
        created_by: userId,
        kind: "PPT",
        title: "Annual PPT / Transition Planning",
        scheduled_at: meetingDate.toISOString(),
        location: "Hartford Regional High School — Conference Room B",
        status: "upcoming",
      })
      .select("id")
      .single();
    const meetingId = (meeting as { id: string }).id;

    await supabase.from("meeting_prep_items").insert([
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.questions_to_ask.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Questions to ask", content: c, completed: false })),
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.documents_to_bring.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Documents to bring", content: c, completed: false })),
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.strengths_to_highlight.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Strengths to highlight", content: c, completed: false })),
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.concerns_to_raise.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Concerns to raise", content: c, completed: false })),
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.goals_to_review.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Goals to review", content: c, completed: false })),
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.services_to_discuss.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Services to discuss", content: c, completed: false })),
      ...DEMO_REPORT_CONTENT.meeting_prep_toolkit.follow_up_items.map((c) => ({ meeting_id: meetingId, student_id: studentId, category: "Follow-up items", content: c, completed: false })),
    ]);

    // 8. Consent records
    await supabase.from("consent_records").insert([
      { student_id: studentId, consenting_user_id: userId, consent_type: "ai_processing", consent_status: "granted", consent_text_snapshot: "I consent to AI-assisted analysis of demo data to generate planning suggestions. AI is a supportive tool and does not replace the school team or professional judgment." },
      { student_id: studentId, consenting_user_id: userId, consent_type: "document_storage", consent_status: "granted", consent_text_snapshot: "I consent to securely storing this student's documents in my private workspace." },
    ]);

    return { ok: true, studentId };
  });
