import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolOrg = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  state: string | null;
  verified_status: string;
};

export type SchoolMember = {
  membership_id: string;
  user_id: string;
  role_within_org: string;
  status: string;
  full_name: string | null;
  email: string | null;
  primary_role: string | null;
  joined_at: string;
};

export type SchoolStudent = {
  id: string;
  first_name: string | null;
  preferred_name: string | null;
  grade_band: string | null;
  owner_id: string;
  owner_name: string | null;
};

export type SchoolDashboard = {
  is_school_admin: boolean;
  orgs: SchoolOrg[];
  selected_org_id: string | null;
  members: SchoolMember[];
  pending_members: SchoolMember[];
  students: SchoolStudent[];
  metrics: {
    total_members: number;
    active_members: number;
    pending_members: number;
    students_count: number;
    reports_count: number;
    documents_count: number;
  };
};

export const getSchoolDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<SchoolDashboard> => {
    const { supabase, userId } = context;

    // Orgs the user admins
    const { data: myAdminMemberships } = await supabase
      .from("organization_memberships")
      .select("organization_id, role_within_org, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"]);

    const adminOrgIds = (myAdminMemberships ?? []).map((m: { organization_id: string }) => m.organization_id);

    if (adminOrgIds.length === 0) {
      return {
        is_school_admin: false,
        orgs: [],
        selected_org_id: null,
        members: [],
        pending_members: [],
        students: [],
        metrics: {
          total_members: 0,
          active_members: 0,
          pending_members: 0,
          students_count: 0,
          reports_count: 0,
          documents_count: 0,
        },
      };
    }

    const { data: orgsData } = await supabase
      .from("organizations")
      .select("id, name, type, city, state, verified_status")
      .in("id", adminOrgIds);
    const orgs = (orgsData ?? []) as SchoolOrg[];

    const selectedOrgId =
      data.org_id && adminOrgIds.includes(data.org_id) ? data.org_id : adminOrgIds[0];

    // All memberships for selected org
    const { data: allMemberships } = await supabase
      .from("organization_memberships")
      .select("id, user_id, role_within_org, status, created_at")
      .eq("organization_id", selectedOrgId)
      .order("created_at", { ascending: false });

    const memberUserIds = Array.from(
      new Set((allMemberships ?? []).map((m: { user_id: string }) => m.user_id)),
    );

    const { data: profilesData } = memberUserIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, email, primary_role")
          .in("id", memberUserIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null; primary_role: string | null }[] };

    const profileMap = new Map(
      (profilesData ?? []).map((p) => [p.id, p]),
    );

    const allMembers: SchoolMember[] = (allMemberships ?? []).map((m: {
      id: string;
      user_id: string;
      role_within_org: string;
      status: string;
      created_at: string;
    }) => {
      const p = profileMap.get(m.user_id);
      return {
        membership_id: m.id,
        user_id: m.user_id,
        role_within_org: m.role_within_org,
        status: m.status,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
        primary_role: p?.primary_role ?? null,
        joined_at: m.created_at,
      };
    });

    const members = allMembers.filter((m) => m.status === "active");
    const pending_members = allMembers.filter((m) => m.status !== "active");

    // Students in this org (preferred) or owned by active members (fallback)
    const { data: orgStudents } = await supabase
      .from("students")
      .select("id, first_name, preferred_name, grade_band, owner_id")
      .eq("organization_id", selectedOrgId)
      .order("created_at", { ascending: false })
      .limit(200);

    const activeMemberIds = members.map((m) => m.user_id);
    const { data: ownerStudents } = activeMemberIds.length
      ? await supabase
          .from("students")
          .select("id, first_name, preferred_name, grade_band, owner_id")
          .in("owner_id", activeMemberIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] };

    const studentMap = new Map<string, { id: string; first_name: string | null; preferred_name: string | null; grade_band: string | null; owner_id: string }>();
    for (const s of [...(orgStudents ?? []), ...(ownerStudents ?? [])]) {
      if (s && "id" in s) studentMap.set(s.id, s);
    }
    const students: SchoolStudent[] = Array.from(studentMap.values()).map((s) => ({
      ...s,
      owner_name: profileMap.get(s.owner_id)?.full_name ?? null,
    }));

    const studentIds = students.map((s) => s.id);
    const [reportsCount, docsCount] = await Promise.all([
      studentIds.length
        ? supabase
            .from("pathway_reports")
            .select("id", { count: "exact", head: true })
            .in("student_id", studentIds)
        : Promise.resolve({ count: 0 }),
      studentIds.length
        ? supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .in("student_id", studentIds)
        : Promise.resolve({ count: 0 }),
    ]);

    return {
      is_school_admin: true,
      orgs,
      selected_org_id: selectedOrgId,
      members,
      pending_members,
      students,
      metrics: {
        total_members: allMembers.length,
        active_members: members.length,
        pending_members: pending_members.length,
        students_count: students.length,
        reports_count: reportsCount.count ?? 0,
        documents_count: docsCount.count ?? 0,
      },
    };
  });

export const updateMembershipStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        membership_id: z.string().uuid(),
        status: z.enum(["active", "invited", "suspended", "removed"]).optional(),
        role_within_org: z
          .enum(["member", "admin", "owner", "school_admin"])
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const adminRoles = ["admin", "owner", "school_admin"];
    const { data: target, error: targetError } = await supabase
      .from("organization_memberships")
      .select("id, organization_id, user_id, role_within_org, status")
      .eq("id", data.membership_id)
      .maybeSingle();
    if (targetError || !target) throw new Error("Membership not found.");

    const { data: callerAdmin, error: callerError } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", target.organization_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", adminRoles)
      .maybeSingle();
    if (callerError || !callerAdmin) {
      throw new Error("You are not authorized to manage this school team.");
    }

    const patch: { status?: string; role_within_org?: string } = {};
    if (data.status) patch.status = data.status;
    if (data.role_within_org) patch.role_within_org = data.role_within_org;
    if (Object.keys(patch).length === 0) return { ok: true };

    const targetIsActiveAdmin =
      target.status === "active" && adminRoles.includes(target.role_within_org);
    const resultingStatus = data.status ?? target.status;
    const resultingRole = data.role_within_org ?? target.role_within_org;
    const targetRemainsActiveAdmin =
      resultingStatus === "active" && adminRoles.includes(resultingRole);

    if (targetIsActiveAdmin && !targetRemainsActiveAdmin) {
      const { count, error: countError } = await supabase
        .from("organization_memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", target.organization_id)
        .eq("status", "active")
        .in("role_within_org", adminRoles);
      if (countError) throw new Error("Could not verify administrator coverage.");
      if ((count ?? 0) <= 1) {
        throw new Error(
          "Cannot remove or demote the last active school administrator. Add another administrator first.",
        );
      }
    }

    const { error } = await supabase
      .from("organization_memberships")
      .update(patch)
      .eq("id", data.membership_id)
      .eq("organization_id", target.organization_id);
    if (error) throw new Error("Could not update membership.");

    void supabase.from("audit_log").insert({
      actor_id: userId,
      action: "school.membership_updated",
      entity_type: "organization_membership",
      entity_id: data.membership_id,
      metadata: {
        organization_id: target.organization_id,
        affected_user_id: target.user_id,
        previous_role: target.role_within_org,
        next_role: resultingRole,
        previous_status: target.status,
        next_status: resultingStatus,
      },
    });
    return { ok: true };
  });

/* ===================== Slice 3 additions ===================== */

export const createSchoolForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(160),
        type: z.enum(["school", "district", "agency"]).default("school"),
        city: z.string().trim().max(120).optional(),
        state: z.string().trim().max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Use admin client to bypass org RLS (organizations INSERT is admin-only)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        type: data.type,
        city: data.city ?? null,
        state: data.state ?? null,
        verified_status: "pending",
      })
      .select("id, name, type, city, state, verified_status")
      .single();
    if (orgErr || !org) throw new Error("Could not create organization.");

    const { error: memErr } = await supabaseAdmin
      .from("organization_memberships")
      .insert({
        organization_id: org.id,
        user_id: userId,
        role_within_org: "school_admin",
        status: "active",
      });
    if (memErr) {
      console.error("createSchoolForAdmin: membership insert failed", memErr);
      throw new Error("Created organization, but couldn't add you as admin.");
    }

    void supabase.from("audit_log").insert({
      actor_id: userId,
      action: "school.created",
      entity_type: "organization",
      entity_id: org.id,
      metadata: { name: data.name },
    });

    return { organization: org };
  });

export const inviteSchoolTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        organization_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(255),
        role_within_org: z.enum(["member", "admin", "school_admin"]).default("member"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Authorize FIRST: caller must be an active admin of the target org.
    // This prevents account enumeration via the listUsers lookup below
    // (distinguishable "not found" vs "already a member" error paths).
    const { data: callerMembership } = await supabase
      .from("organization_memberships")
      .select("role_within_org, status")
      .eq("organization_id", data.organization_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"])
      .maybeSingle();
    if (!callerMembership) {
      throw new Error("Could not add teammate.");
    }

    // Resolve user by email
    let invitedUserId: string | null = null;
    try {
      let page = 1;
      while (page <= 5) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
        if (hit) {
          invitedUserId = hit.id;
          break;
        }
        if (list.users.length < 200) break;
        page++;
      }
    } catch {
      /* ignore */
    }

    if (!invitedUserId) {
      // Generic message — do not reveal whether the email is registered.
      throw new Error("Could not add teammate.");
    }

    const { error } = await supabase.from("organization_memberships").insert({
      organization_id: data.organization_id,
      user_id: invitedUserId,
      role_within_org: data.role_within_org,
      status: "active",
    });
    if (error) {
      if (error.code === "23505") throw new Error("That person is already on your team.");
      console.error("inviteSchoolTeammate failed", error);
      throw new Error("Could not add teammate.");
    }

    void supabase.from("audit_log").insert({
      actor_id: userId,
      action: "school.member_added",
      entity_type: "organization",
      entity_id: data.organization_id,
      metadata: { email: data.email, role: data.role_within_org },
    });

    return { ok: true };
  });

export type SchoolReportRow = {
  id: string;
  student_id: string;
  student_name: string;
  created_at: string;
  audience: string | null;
};

export const listSchoolReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ organization_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the caller actually admins this org
    const { data: mem } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", data.organization_id)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"])
      .maybeSingle();
    if (!mem) return { reports: [] as SchoolReportRow[] };

    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .eq("organization_id", data.organization_id);

    const ids = (students ?? []).map((s) => s.id);
    if (ids.length === 0) return { reports: [] as SchoolReportRow[] };

    const nameMap = new Map(
      (students ?? []).map((s) => [
        s.id,
        `${s.preferred_name ?? s.first_name ?? "Student"} ${s.last_name ?? ""}`.trim(),
      ]),
    );

    const { data: reports } = await supabaseAdmin
      .from("pathway_reports")
      .select("id, student_id, created_at")
      .in("student_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);

    const rows: SchoolReportRow[] = (reports ?? [])
      .filter((r) => !!r.student_id)
      .map((r) => ({
        id: r.id,
        student_id: r.student_id as string,
        student_name: nameMap.get(r.student_id as string) ?? "Student",
        created_at: r.created_at,
        audience: null,
      }));
    return { reports: rows };
  });

export type SchoolReadiness = {
  total_students: number;
  with_pathway_report: number;
  with_open_action_items: number;
  with_active_goals: number;
  avg_open_actions_per_student: number;
};

export const getSchoolReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ organization_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<SchoolReadiness> => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mem } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", data.organization_id)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"])
      .maybeSingle();
    if (!mem) {
      return {
        total_students: 0,
        with_pathway_report: 0,
        with_open_action_items: 0,
        with_active_goals: 0,
        avg_open_actions_per_student: 0,
      };
    }

    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("organization_id", data.organization_id);
    const ids = (students ?? []).map((s) => s.id);
    if (ids.length === 0) {
      return {
        total_students: 0,
        with_pathway_report: 0,
        with_open_action_items: 0,
        with_active_goals: 0,
        avg_open_actions_per_student: 0,
      };
    }

    const [{ data: reports }, { data: actions }, { data: goals }] = await Promise.all([
      supabaseAdmin.from("pathway_reports").select("student_id").in("student_id", ids),
      supabaseAdmin.from("action_items").select("student_id, status").in("student_id", ids),
      supabaseAdmin.from("goals").select("student_id, status").in("student_id", ids),
    ]);

    const withReport = new Set((reports ?? []).map((r) => r.student_id).filter((x): x is string => !!x));
    const openByStudent = new Map<string, number>();
    for (const a of actions ?? []) {
      if (!a.student_id) continue;
      if (a.status !== "complete") {
        openByStudent.set(a.student_id, (openByStudent.get(a.student_id) ?? 0) + 1);
      }
    }
    const withActiveGoals = new Set(
      (goals ?? [])
        .filter((g) => g.status !== "met" && !!g.student_id)
        .map((g) => g.student_id as string),
    );

    const totalOpen = Array.from(openByStudent.values()).reduce((n, v) => n + v, 0);

    return {
      total_students: ids.length,
      with_pathway_report: withReport.size,
      with_open_action_items: openByStudent.size,
      with_active_goals: withActiveGoals.size,
      avg_open_actions_per_student: ids.length ? Math.round((totalOpen / ids.length) * 10) / 10 : 0,
    };
  });

/* ---------- date-windowed report metrics ---------- */

export type SchoolReportWindow = {
  from: string | null;
  to: string | null;
  metrics: {
    students_count: number;
    reports_count: number;
    open_actions: number;
    active_goals: number;
    pct_with_report: number;
    pct_with_goals: number;
    pct_with_actions: number;
    avg_open_actions_per_student: number;
  };
  students: Array<{
    id: string;
    name: string;
    grade_band: string | null;
    reports_count: number;
    open_actions: number;
    active_goals: number;
    has_report: boolean;
  }>;
};

export const getSchoolReportMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        organization_id: z.string().uuid(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<SchoolReportWindow> => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mem } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", data.organization_id)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"])
      .maybeSingle();
    if (!mem) {
      return {
        from: data.from ?? null,
        to: data.to ?? null,
        metrics: {
          students_count: 0,
          reports_count: 0,
          open_actions: 0,
          active_goals: 0,
          pct_with_report: 0,
          pct_with_goals: 0,
          pct_with_actions: 0,
          avg_open_actions_per_student: 0,
        },
        students: [],
      };
    }

    const { data: studentRows } = await supabaseAdmin
      .from("students")
      .select("id, first_name, last_name, preferred_name, grade_band")
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });

    const students = (studentRows ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      preferred_name: string | null;
      grade_band: string | null;
    }>;
    const ids = students.map((s) => s.id);

    if (ids.length === 0) {
      return {
        from: data.from ?? null,
        to: data.to ?? null,
        metrics: {
          students_count: 0,
          reports_count: 0,
          open_actions: 0,
          active_goals: 0,
          pct_with_report: 0,
          pct_with_goals: 0,
          pct_with_actions: 0,
          avg_open_actions_per_student: 0,
        },
        students: [],
      };
    }

    const applyWindow = (q: any) => {
      let out = q;
      if (data.from) out = out.gte("created_at", data.from);
      if (data.to) out = out.lte("created_at", data.to);
      return out;
    };

    const [reportsRes, actionsRes, goalsRes] = await Promise.all([
      applyWindow(
        supabaseAdmin.from("pathway_reports").select("student_id, created_at").in("student_id", ids),
      ),
      applyWindow(
        supabaseAdmin
          .from("action_items")
          .select("student_id, status, created_at")
          .in("student_id", ids),
      ),
      applyWindow(
        supabaseAdmin
          .from("goals")
          .select("student_id, status, created_at")
          .in("student_id", ids),
      ),
    ]);

    const reportRows = (reportsRes.data ?? []) as Array<{ student_id: string | null }>;
    const actionRows = (actionsRes.data ?? []) as Array<{
      student_id: string | null;
      status: string;
    }>;
    const goalRows = (goalsRes.data ?? []) as Array<{
      student_id: string | null;
      status: string;
    }>;

    const reportsByStudent = new Map<string, number>();
    for (const r of reportRows) {
      if (!r.student_id) continue;
      reportsByStudent.set(r.student_id, (reportsByStudent.get(r.student_id) ?? 0) + 1);
    }
    const openActionsByStudent = new Map<string, number>();
    for (const a of actionRows) {
      if (!a.student_id || a.status === "complete") continue;
      openActionsByStudent.set(a.student_id, (openActionsByStudent.get(a.student_id) ?? 0) + 1);
    }
    const activeGoalsByStudent = new Map<string, number>();
    for (const g of goalRows) {
      if (!g.student_id || g.status === "met") continue;
      activeGoalsByStudent.set(g.student_id, (activeGoalsByStudent.get(g.student_id) ?? 0) + 1);
    }

    const perStudent = students.map((s) => {
      const rc = reportsByStudent.get(s.id) ?? 0;
      return {
        id: s.id,
        name: `${s.preferred_name ?? s.first_name ?? "Student"} ${s.last_name ?? ""}`.trim(),
        grade_band: s.grade_band,
        reports_count: rc,
        open_actions: openActionsByStudent.get(s.id) ?? 0,
        active_goals: activeGoalsByStudent.get(s.id) ?? 0,
        has_report: rc > 0,
      };
    });

    const reportsTotal = perStudent.reduce((n, s) => n + s.reports_count, 0);
    const openActionsTotal = perStudent.reduce((n, s) => n + s.open_actions, 0);
    const activeGoalsTotal = perStudent.reduce((n, s) => n + s.active_goals, 0);
    const withReport = perStudent.filter((s) => s.has_report).length;
    const withGoals = perStudent.filter((s) => s.active_goals > 0).length;
    const withActions = perStudent.filter((s) => s.open_actions > 0).length;

    return {
      from: data.from ?? null,
      to: data.to ?? null,
      metrics: {
        students_count: ids.length,
        reports_count: reportsTotal,
        open_actions: openActionsTotal,
        active_goals: activeGoalsTotal,
        pct_with_report: Math.round((withReport / ids.length) * 100),
        pct_with_goals: Math.round((withGoals / ids.length) * 100),
        pct_with_actions: Math.round((withActions / ids.length) * 100),
        avg_open_actions_per_student:
          Math.round((openActionsTotal / ids.length) * 10) / 10,
      },
      students: perStudent,
    };
  });
