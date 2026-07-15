import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireFeatureEntitlement } from "./entitlement-guard";

/* ---------- STUDENTS ---------- */

const StudentInput = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).optional(),
  grade_band: z.enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  school: z.string().trim().max(160).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type Student = {
  id: string;
  owner_id: string;
  first_name: string;
  last_name: string | null;
  grade_band: string | null;
  school: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listStudents failed", error);
      return { students: [] as Student[] };
    }
    return { students: (data ?? []) as Student[] };
  });

export const getStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Student not found.");
    return row as Student;
  });

/**
 * Returns whether the current user can edit the given student (owner,
 * editor-collaborator, or platform admin). Mirrors the SQL `can_edit_student`
 * helper used by RLS, letting the UI hide write affordances for viewers.
 */
export const canEditStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.rpc("can_edit_student", {
      _user_id: userId,
      _student_id: data.student_id,
    });
    if (error) {
      console.error("canEditStudent failed", error);
      return { canEdit: false };
    }
    return { canEdit: !!row };
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StudentInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("students")
      .insert({
        owner_id: userId,
        first_name: data.first_name,
        last_name: data.last_name ?? null,
        grade_band: data.grade_band ?? null,
        school: data.school ?? null,
        date_of_birth: data.date_of_birth ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("createStudent failed", error);
      throw new Error("Could not create student.");
    }

    // Auto-record the creator's relationship to this student based on their role.
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_role, email, organization_id")
      .eq("id", userId)
      .maybeSingle();
    const role = profile?.primary_role ?? "parent";
    const email = profile?.email ?? "";

    const guardianRoles = new Set(["parent", "guardian", "student"]);
    const teamRoles = new Set(["educator", "teacher", "case_manager", "administrator", "school_admin", "admin"]);

    try {
      if (guardianRoles.has(role)) {
        await supabase.from("student_guardians").insert({
          student_id: row.id,
          guardian_user_id: userId,
          guardian_email: email || "unknown@local",
          relationship: role,
          is_primary: true,
          verified: true,
        });
      } else if (teamRoles.has(role)) {
        await supabase.from("student_team_members").insert({
          student_id: row.id,
          member_user_id: userId,
          member_email: email || "unknown@local",
          role_on_team: role === "administrator" ? "school_admin" : role,
          organization_id: profile?.organization_id ?? null,
          status: "active",
        });
      }
    } catch (relErr) {
      console.error("createStudent: relationship row failed (non-fatal)", relErr);
    }

    return row as Student;
  });


export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("students").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete student.");
    return { ok: true };
  });

/* ---------- GOALS ---------- */

const GoalInput = z.object({
  student_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z
    .enum(["academic", "life-skills", "career", "college", "transportation", "communication", "general"])
    .default("general"),
  status: z.enum(["not-started", "in-progress", "met", "paused"]).default("not-started"),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  measurable_criteria: z.string().trim().max(1000).optional(),
});

export type Goal = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  target_date: string | null;
  measurable_criteria: string | null;
  created_at: string;
  updated_at: string;
};

export const listGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("goals")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listGoals failed", error);
      return { goals: [] as Goal[] };
    }
    return { goals: (rows ?? []) as Goal[] };
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GoalInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("goals")
      .insert({
        student_id: data.student_id,
        created_by: userId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        status: data.status,
        target_date: data.target_date ?? null,
        measurable_criteria: data.measurable_criteria ?? null,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("createGoal failed", error);
      throw new Error("Could not save goal.");
    }
    return row as Goal;
  });

export const updateGoalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["not-started", "in-progress", "met", "paused"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("goals").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Could not update goal.");
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("goals").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete goal.");
    return { ok: true };
  });

/* ---------- SHARE TOKENS ---------- */

function randomToken(bytes = 24) {
  // URL-safe base64
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ShareTokenRow = {
  id: string;
  token: string;
  report_id: string;
  audience: string;
  expires_at: string | null;
  revoked: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

export const createShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      report_id: z.string().uuid(),
      audience: z.enum(["family", "educator"]).default("family"),
      expires_in_days: z.number().int().min(1).max(365).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireFeatureEntitlement(supabase, userId, "family");

    // Verify the caller owns or can access the referenced report before minting
    // a share token. RLS also enforces this, but we surface a clear error.
    const { data: report, error: reportErr } = await supabase
      .from("pathway_reports")
      .select("id, user_id, student_id")
      .eq("id", data.report_id)
      .maybeSingle();
    if (reportErr || !report) throw new Error("Report not found.");
    if (report.user_id !== userId) {
      let allowed = false;
      if (report.student_id) {
        const { data: canAccess } = await supabase.rpc("can_access_student", {
          _user_id: userId,
          _student_id: report.student_id,
        });
        allowed = !!canAccess;
      }
      if (!allowed) throw new Error("You do not have access to this report.");
    }

    const token = randomToken();
    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86_400_000).toISOString()
      : null;
    const { data: row, error } = await supabase
      .from("share_tokens")
      .insert({
        token,
        report_id: data.report_id,
        created_by: userId,
        audience: data.audience,
        expires_at,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("createShareToken failed", error);
      throw new Error("Could not create share link.");
    }
    return row as ShareTokenRow;
  });

export const listShareTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ report_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("share_tokens")
      .select("*")
      .eq("report_id", data.report_id)
      .order("created_at", { ascending: false });
    if (error) return { tokens: [] as ShareTokenRow[] };
    return { tokens: (rows ?? []) as ShareTokenRow[] };
  });

export const revokeShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("share_tokens")
      .update({ revoked: true })
      .eq("id", data.id);
    if (error) throw new Error("Could not revoke link.");
    return { ok: true };
  });
