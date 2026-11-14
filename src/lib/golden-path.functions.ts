import { optionalViewerIntent, assertExpectedViewer } from "@/lib/viewer-intent";
import { readOrganizationPages, organizationReadError } from "@/lib/organization-query-pages";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * GOLDEN PATH — Parent dashboard data + retired sample compatibility
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
  .validator((i: unknown) => z.object({ student_id: z.string().uuid().optional(), expected_viewer_id: z.string().min(1).max(100).optional() }).parse(i))
  .handler(async ({ data, context }): Promise<DashboardSnapshot> => {
    const { supabase, userId } = context;
    assertExpectedViewer(data, userId);

    let studentId = data.student_id ?? null;
    if (!studentId) {
      const { data: first, error: firstError } = await supabase
        .from("students")
        .select("id")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .order("id")
        .limit(1)
        .maybeSingle();
      if (firstError) throw organizationReadError();
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

    // Confirm this exact caller-visible student before reading any child data.
    const { data: studentRow, error: studentError } = await supabase
      .from("students")
      .select(
        "id,first_name,last_name,preferred_name,grade_band,school,expected_graduation_year,strengths_summary,interests_summary,support_needs_summary,family_priorities,current_transition_status,readiness_level,student_voice_statement",
      )
      .eq("id", studentId)
      .maybeSingle();
    if (studentError) throw organizationReadError();
    if (!studentRow || studentRow.id !== studentId)
      throw new Error("This student is unavailable. Choose an accessible student and try again.");
    const observedAt = new Date(Date.now()).toISOString();
    const [reportRes, goals, documents, actionItems, meetingRes, consents] = await Promise.all([
      supabase
        .from("pathway_reports")
        .select("id,created_at,content")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(1)
        .maybeSingle(),
      readOrganizationPages<DashboardSnapshot["goals"][number]>((from, to) =>
        supabase
          .from("goals")
          .select("id,title,category,status", { count: "exact" })
          .eq("student_id", studentId)
          .order("created_at", { ascending: true })
          .order("id")
          .range(from, to),
      ),
      readOrganizationPages<DashboardSnapshot["documents"][number]>((from, to) =>
        supabase
          .from("documents")
          .select("id,title,doc_type,status,created_at", { count: "exact" })
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      readOrganizationPages((from, to) =>
        supabase
          .from("action_items")
          .select(
            "id,student_id,title,description,category,priority,status,due_date,related_goal_area,pathway_report_id,created_at",
            { count: "exact" },
          )
          .eq("student_id", studentId)
          .order("priority", { ascending: false })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("id")
          .range(from, to),
      ),
      supabase
        .from("meetings")
        .select("id,title,kind,scheduled_at,location,status")
        .eq("student_id", studentId)
        .in("status", ["upcoming"])
        .gte("scheduled_at", observedAt)
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .order("id")
        .limit(1)
        .maybeSingle(),
      readOrganizationPages<ConsentRow>((from, to) =>
        supabase
          .from("consent_records")
          .select(
            "id,student_id,consent_type,consent_status,granted_at,revoked_at,expires_at,consent_text_snapshot",
            { count: "exact" },
          )
          .eq("student_id", studentId)
          .order("granted_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ]);
    if (reportRes.error || meetingRes.error) throw organizationReadError();
    const upcomingMeeting = (meetingRes.data ?? null) as DashboardSnapshot["upcomingMeeting"];
    let meetingPrep: MeetingPrepRow[] = [];
    if (upcomingMeeting)
      meetingPrep = await readOrganizationPages<MeetingPrepRow>((from, to) =>
        supabase
          .from("meeting_prep_items")
          .select("id,meeting_id,student_id,category,content,completed", { count: "exact" })
          .eq("meeting_id", upcomingMeeting.id)
          .eq("student_id", studentId)
          .order("category", { ascending: true })
          .order("id")
          .range(from, to),
      );

    // Recommended resources — match by topic against student interests/needs
    const student = studentRow as DashboardSnapshot["student"];
    const haystack = [
      student?.strengths_summary,
      student?.interests_summary,
      student?.support_needs_summary,
      student?.family_priorities,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const [allResources, savedRows] = await Promise.all([
      readOrganizationPages<
        Omit<DashboardSnapshot["recommendedResources"][number], "matched_reason" | "saved">
      >((from, to) =>
        supabase
          .from("resources")
          .select("id,title,description,resource_type,topic,url", { count: "exact" })
          .order("created_at", { ascending: true })
          .order("id")
          .range(from, to),
      ),
      readOrganizationPages<{ resource_id: string }>((from, to) =>
        supabase
          .from("saved_resources")
          .select("id,resource_id", { count: "exact" })
          .eq("user_id", userId)
          .order("id")
          .range(from, to),
      ),
    ]);
    const savedIds = new Set(savedRows.map((row) => row.resource_id));

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

    const recommendedResources = (
      (allResources ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        resource_type: string;
        topic: string | null;
        url: string | null;
      }>
    )
      .map((r) => {
        const topic = (r.topic ?? "").toLowerCase();
        const hints = TOPIC_HINTS.find(([t]) => t === topic)?.[1] ?? [];
        const matched = hints.some((h) => haystack.includes(h));
        return {
          ...r,
          matched_reason: matched
            ? `Topic keywords overlap with your saved planning notes: ${topic}.`
            : topic
              ? `Browse this ${topic} resource; no topic keyword overlap was found.`
              : "General transition planning resource; no topic keyword overlap was found.",
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
      goals,
      documents,
      actionItems: actionItems as ActionItemRow[],
      upcomingMeeting,
      meetingPrep,
      recommendedResources,
      consents,
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


/* ---------- RETIRED PERSONAL-WORKSPACE SAMPLE WRITER ---------- */

// Keep the authenticated endpoint fail-closed for older clients. Samples now
// use the shared read-only role previews; no student, document, report, consent,
// file, queue or processing record may be created by this compatibility path.
export const seedDemoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data: intent, context }) => {
    assertExpectedViewer(intent, context.userId);
    throw new Error("The sample workspace has moved. Open Demo Mode to explore it without changing your account.");
  });
