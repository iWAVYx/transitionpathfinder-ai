import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAuthorized } from "./authz";

/* =========================================================================
 * School District Administrator — server functions.
 *
 * A "district" is an `organizations` row with type = 'district'. Schools
 * belong to a district via `organizations.parent_organization_id`.
 *
 * District-level oversight aggregates non-sensitive metrics (counts, % with
 * Pathway Reports, % with goals, etc.). Sensitive student-level records
 * (documents, individual goals) remain protected by RLS — district admins
 * do NOT automatically get access to private documents.
 * ========================================================================= */

export type DistrictOrg = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  verified_status: string;
};

export type DistrictSchool = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  verified_status: string;
  active_members: number;
  pending_members: number;
  students_count: number;
  reports_count: number;
  open_actions: number;
  needs_followup: boolean;
};

export type DistrictMember = {
  membership_id: string;
  user_id: string;
  role_within_org: string;
  status: string;
  full_name: string | null;
  email: string | null;
  primary_role: string | null;
  joined_at: string;
};

export type DistrictDashboard = {
  is_district_admin: boolean;
  districts: DistrictOrg[];
  selected_district_id: string | null;
  schools: DistrictSchool[];
  team: DistrictMember[];
  pending_team: DistrictMember[];
  metrics: {
    schools_count: number;
    school_admins: number;
    educators: number;
    students_count: number;
    reports_count: number;
    pct_with_report: number;
    pct_with_goals: number;
    pct_with_actions: number;
    open_actions: number;
  };
};

/* ---------- helpers ---------- */

async function ensureDistrictAdmin(
  supabase: SupabaseLike,
  userId: string,
  districtId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", districtId)
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role_within_org", ["admin", "owner", "district_admin"])
    .maybeSingle();
  return !!data;
}

type SupabaseLike = {
  from: (t: string) => {
    select: (s: string, opts?: { count?: "exact"; head?: boolean }) => any;
  };
};

/* ---------- main dashboard ---------- */

export const getDistrictDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ district_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<DistrictDashboard> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Districts the user admins
    const { data: myMemberships } = await supabase
      .from("organization_memberships")
      .select("organization_id, role_within_org, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "district_admin"]);

    const adminOrgIds = (myMemberships ?? []).map(
      (m: { organization_id: string }) => m.organization_id,
    );

    if (adminOrgIds.length === 0) {
      return emptyDashboard();
    }

    const { data: districtsData } = await supabaseAdmin
      .from("organizations")
      .select("id, name, type, city, state, verified_status")
      .in("id", adminOrgIds)
      .eq("type", "district");

    const districts = (districtsData ?? []) as Array<DistrictOrg & { type: string }>;
    if (districts.length === 0) return emptyDashboard();

    const selectedDistrictId =
      data.district_id && districts.find((d) => d.id === data.district_id)
        ? data.district_id
        : districts[0].id;

    // 2. Schools under this district
    const { data: schoolRows } = await supabaseAdmin
      .from("organizations")
      .select("id, name, city, state, verified_status")
      .eq("parent_organization_id", selectedDistrictId)
      .order("name");
    const schoolIds = (schoolRows ?? []).map((s: { id: string }) => s.id);

    // 3. District team (people whose membership is on the district org itself)
    const { data: teamRows } = await supabaseAdmin
      .from("organization_memberships")
      .select("id, user_id, role_within_org, status, created_at")
      .eq("organization_id", selectedDistrictId)
      .order("created_at", { ascending: false });

    const teamUserIds = Array.from(
      new Set((teamRows ?? []).map((m: { user_id: string }) => m.user_id)),
    );

    const { data: profileRows } = teamUserIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, primary_role")
          .in("id", teamUserIds)
      : { data: [] as Array<{ id: string; full_name: string | null; email: string | null; primary_role: string | null }> };

    const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

    const teamAll: DistrictMember[] = (teamRows ?? []).map((m: {
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
    const team = teamAll.filter((m) => m.status === "active");
    const pending_team = teamAll.filter((m) => m.status !== "active");

    // 4. Per-school aggregate metrics (counts only — no sensitive content)
    let schoolAdminsTotal = 0;
    let educatorsTotal = 0;
    let studentsTotal = 0;
    let reportsTotal = 0;
    let openActionsTotal = 0;
    let withReportTotal = 0;
    let withGoalsTotal = 0;
    let withActionsTotal = 0;

    const perSchool: DistrictSchool[] = [];

    if (schoolIds.length > 0) {
      const { data: allSchoolMems } = await supabaseAdmin
        .from("organization_memberships")
        .select("organization_id, user_id, role_within_org, status")
        .in("organization_id", schoolIds);

      // Build map: orgId -> { active, pending, schoolAdmin, educator counts }
      const memByOrg = new Map<
        string,
        { active: number; pending: number; admins: number; educators: number }
      >();
      const memberIdsByOrg = new Map<string, string[]>();
      for (const m of allSchoolMems ?? []) {
        const bucket = memByOrg.get(m.organization_id) ?? {
          active: 0,
          pending: 0,
          admins: 0,
          educators: 0,
        };
        if (m.status === "active") bucket.active += 1;
        else bucket.pending += 1;
        if (["school_admin", "admin", "owner"].includes(m.role_within_org))
          bucket.admins += 1;
        if (["member", "educator", "case_manager", "teacher"].includes(m.role_within_org))
          bucket.educators += 1;
        memByOrg.set(m.organization_id, bucket);

        if (m.status === "active") {
          const arr = memberIdsByOrg.get(m.organization_id) ?? [];
          arr.push(m.user_id);
          memberIdsByOrg.set(m.organization_id, arr);
        }
      }

      // Students per school (org-scoped)
      const { data: orgStudents } = await supabaseAdmin
        .from("students")
        .select("id, organization_id")
        .in("organization_id", schoolIds);

      const studentsByOrg = new Map<string, string[]>();
      for (const s of orgStudents ?? []) {
        if (!s.organization_id) continue;
        const arr = studentsByOrg.get(s.organization_id) ?? [];
        arr.push(s.id);
        studentsByOrg.set(s.organization_id, arr);
      }

      const allStudentIds = (orgStudents ?? []).map((s) => s.id);

      const [{ data: reportRows }, { data: actionRows }, { data: goalRows }] =
        await Promise.all([
          allStudentIds.length
            ? supabaseAdmin
                .from("pathway_reports")
                .select("student_id")
                .in("student_id", allStudentIds)
            : Promise.resolve({ data: [] as Array<{ student_id: string | null }> }),
          allStudentIds.length
            ? supabaseAdmin
                .from("action_items")
                .select("student_id, status")
                .in("student_id", allStudentIds)
            : Promise.resolve({ data: [] as Array<{ student_id: string | null; status: string }> }),
          allStudentIds.length
            ? supabaseAdmin
                .from("goals")
                .select("student_id, status")
                .in("student_id", allStudentIds)
            : Promise.resolve({ data: [] as Array<{ student_id: string | null; status: string }> }),
        ]);

      const reportsByStudent = new Set(
        (reportRows ?? [])
          .map((r) => r.student_id)
          .filter((x): x is string => !!x),
      );
      const goalsByStudent = new Set(
        (goalRows ?? [])
          .filter((g) => g.status !== "met" && !!g.student_id)
          .map((g) => g.student_id as string),
      );
      const actionsByStudent = new Map<string, number>();
      for (const a of actionRows ?? []) {
        if (!a.student_id || a.status === "complete") continue;
        actionsByStudent.set(
          a.student_id,
          (actionsByStudent.get(a.student_id) ?? 0) + 1,
        );
      }

      for (const s of schoolRows ?? []) {
        const ids = studentsByOrg.get(s.id) ?? [];
        const reports = ids.filter((id) => reportsByStudent.has(id)).length;
        const openActs = ids.reduce((n, id) => n + (actionsByStudent.get(id) ?? 0), 0);
        const m = memByOrg.get(s.id) ?? { active: 0, pending: 0, admins: 0, educators: 0 };
        const needs = ids.length === 0 || (ids.length > 0 && reports === 0);
        perSchool.push({
          id: s.id,
          name: s.name,
          city: s.city,
          state: s.state,
          verified_status: s.verified_status,
          active_members: m.active,
          pending_members: m.pending,
          students_count: ids.length,
          reports_count: reports,
          open_actions: openActs,
          needs_followup: needs,
        });
        schoolAdminsTotal += m.admins;
        educatorsTotal += m.educators;
        studentsTotal += ids.length;
        reportsTotal += reports;
        openActionsTotal += openActs;
        withReportTotal += ids.filter((id) => reportsByStudent.has(id)).length;
        withGoalsTotal += ids.filter((id) => goalsByStudent.has(id)).length;
        withActionsTotal += ids.filter((id) => (actionsByStudent.get(id) ?? 0) > 0).length;
      }
    }

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    return {
      is_district_admin: true,
      districts: districts.map((d) => ({
        id: d.id,
        name: d.name,
        city: d.city,
        state: d.state,
        verified_status: d.verified_status,
      })),
      selected_district_id: selectedDistrictId,
      schools: perSchool,
      team,
      pending_team,
      metrics: {
        schools_count: perSchool.length,
        school_admins: schoolAdminsTotal,
        educators: educatorsTotal,
        students_count: studentsTotal,
        reports_count: reportsTotal,
        pct_with_report: pct(withReportTotal, studentsTotal),
        pct_with_goals: pct(withGoalsTotal, studentsTotal),
        pct_with_actions: pct(withActionsTotal, studentsTotal),
        open_actions: openActionsTotal,
      },
    };
  });

function emptyDashboard(): DistrictDashboard {
  return {
    is_district_admin: false,
    districts: [],
    selected_district_id: null,
    schools: [],
    team: [],
    pending_team: [],
    metrics: {
      schools_count: 0,
      school_admins: 0,
      educators: 0,
      students_count: 0,
      reports_count: 0,
      pct_with_report: 0,
      pct_with_goals: 0,
      pct_with_actions: 0,
      open_actions: 0,
    },
  };
}

/* ---------- mutations ---------- */

export const createDistrict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(160),
        city: z.string().trim().max(120).optional(),
        state: z.string().trim().max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        type: "district",
        city: data.city ?? null,
        state: data.state ?? null,
        verified_status: "pending",
      })
      .select("id, name, type, city, state, verified_status")
      .single();
    if (orgErr || !org) throw new Error("Could not create district.");

    const { error: memErr } = await supabaseAdmin
      .from("organization_memberships")
      .insert({
        organization_id: org.id,
        user_id: userId,
        role_within_org: "district_admin",
        status: "active",
      });
    if (memErr) {
      console.error("createDistrict: membership insert failed", memErr);
      throw new Error("Created district, but couldn't add you as admin.");
    }

    void supabase.from("audit_log").insert({
      actor_id: userId,
      action: "district.created",
      entity_type: "organization",
      entity_id: org.id,
      metadata: { name: data.name },
    });

    return { district: org };
  });

export const addSchoolToDistrict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        district_id: z.string().uuid(),
        // Either link an existing school by id, or create a new pending school by name.
        school_id: z.string().uuid().optional(),
        new_school_name: z.string().trim().min(2).max(160).optional(),
        city: z.string().trim().max(120).optional(),
        state: z.string().trim().max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAuthorized(
      { supabase, userId, action: "manage", resourceType: "organization", resourceId: data.district_id },
      "Not authorized for this district.",
    );
    if (!(await ensureDistrictAdmin(supabase, userId, data.district_id))) {
      throw new Error("Not authorized for this district.");
    }

    let schoolId = data.school_id ?? null;
    if (!schoolId) {
      if (!data.new_school_name) throw new Error("Provide a school to add.");
      const { data: created, error: schoolErr } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: data.new_school_name,
          type: "school",
          city: data.city ?? null,
          state: data.state ?? null,
          parent_organization_id: data.district_id,
          verified_status: "pending",
        })
        .select("id")
        .single();
      if (schoolErr || !created) throw new Error("Could not create school.");
      schoolId = created.id;
    } else {
      // SECURITY: only allow re-parenting a school if it is currently unclaimed
      // (no parent district) OR the caller is independently an active
      // admin/owner of that school. Without this guard, any district admin
      // could annex an arbitrary existing school by UUID and gain visibility
      // into its team + aggregate metrics.
      const { data: targetSchool, error: fetchErr } = await supabaseAdmin
        .from("organizations")
        .select("id, type, parent_organization_id")
        .eq("id", schoolId)
        .maybeSingle();
      if (fetchErr || !targetSchool) throw new Error("School not found.");
      if (targetSchool.type !== "school") throw new Error("Target is not a school.");

      const alreadyClaimed =
        targetSchool.parent_organization_id !== null &&
        targetSchool.parent_organization_id !== data.district_id;

      if (alreadyClaimed) {
        const { data: schoolMem } = await supabaseAdmin
          .from("organization_memberships")
          .select("id")
          .eq("organization_id", schoolId)
          .eq("user_id", userId)
          .eq("status", "active")
          .in("role_within_org", ["admin", "owner", "school_admin"])
          .maybeSingle();
        if (!schoolMem) {
          throw new Error(
            "This school already belongs to another district. Ask a school admin to move it.",
          );
        }
      }

      const { error: updErr } = await supabaseAdmin
        .from("organizations")
        .update({ parent_organization_id: data.district_id })
        .eq("id", schoolId)
        .eq("type", "school");
      if (updErr) throw new Error("Could not link school to district.");
    }

    void supabase.from("audit_log").insert({
      actor_id: userId,
      action: "district.school_linked",
      entity_type: "organization",
      entity_id: schoolId,
      metadata: { district_id: data.district_id },
    });
    return { ok: true, school_id: schoolId };
  });

export const removeSchoolFromDistrict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ district_id: z.string().uuid(), school_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAuthorized(
      { supabase, userId, action: "manage", resourceType: "organization", resourceId: data.district_id },
      "Not authorized for this district.",
    );
    if (!(await ensureDistrictAdmin(supabase, userId, data.district_id))) {
      throw new Error("Not authorized.");
    }
    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ parent_organization_id: null })
      .eq("id", data.school_id)
      .eq("parent_organization_id", data.district_id);
    if (error) throw new Error("Could not unlink school.");
    return { ok: true };
  });

export const inviteDistrictTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        district_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(255),
        role_within_org: z
          .enum(["member", "admin", "district_admin"])
          .default("member"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAuthorized(
      { supabase, userId, action: "manage", resourceType: "organization", resourceId: data.district_id },
      "Not authorized for this district.",
    );
    if (!(await ensureDistrictAdmin(supabase, userId, data.district_id))) {
      throw new Error("Not authorized for this district.");
    }

    let invitedUserId: string | null = null;
    try {
      let page = 1;
      while (page <= 5) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) break;
        const hit = list.users.find(
          (u) => (u.email ?? "").toLowerCase() === data.email,
        );
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
      throw new Error(
        "We couldn't find a TransitionForward account with that email. Ask them to sign up first.",
      );
    }

    const { error } = await supabaseAdmin
      .from("organization_memberships")
      .insert({
        organization_id: data.district_id,
        user_id: invitedUserId,
        role_within_org: data.role_within_org,
        status: "active",
      });
    if (error) {
      if (error.code === "23505")
        throw new Error("That person is already on your district team.");
      throw new Error("Could not add teammate.");
    }

    void supabase.from("audit_log").insert({
      actor_id: userId,
      action: "district.member_added",
      entity_type: "organization",
      entity_id: data.district_id,
      metadata: { email: data.email, role: data.role_within_org },
    });
    return { ok: true };
  });

/* ---------- date-windowed report metrics ---------- */

export type DistrictReportWindow = {
  from: string | null;
  to: string | null;
  metrics: {
    schools_count: number;
    students_count: number;
    reports_count: number;
    open_actions: number;
    pct_with_report: number;
    pct_with_goals: number;
    pct_with_actions: number;
  };
  schools: Array<{
    id: string;
    name: string;
    students_count: number;
    reports_count: number;
    open_actions: number;
  }>;
};

export const getDistrictReportMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        district_id: z.string().uuid(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<DistrictReportWindow> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await ensureDistrictAdmin(supabase, userId, data.district_id))) {
      throw new Error("Not authorized for this district.");
    }

    const { data: schoolRows } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("parent_organization_id", data.district_id)
      .order("name");
    const schools = (schoolRows ?? []) as Array<{ id: string; name: string }>;
    const schoolIds = schools.map((s) => s.id);

    if (schoolIds.length === 0) {
      return {
        from: data.from ?? null,
        to: data.to ?? null,
        metrics: {
          schools_count: 0,
          students_count: 0,
          reports_count: 0,
          open_actions: 0,
          pct_with_report: 0,
          pct_with_goals: 0,
          pct_with_actions: 0,
        },
        schools: [],
      };
    }

    const { data: orgStudents } = await supabaseAdmin
      .from("students")
      .select("id, organization_id")
      .in("organization_id", schoolIds);
    const studentsByOrg = new Map<string, string[]>();
    for (const s of orgStudents ?? []) {
      if (!s.organization_id) continue;
      const arr = studentsByOrg.get(s.organization_id) ?? [];
      arr.push(s.id);
      studentsByOrg.set(s.organization_id, arr);
    }
    const allStudentIds = (orgStudents ?? []).map((s) => s.id);

    const applyWindow = (q: any) => {
      let out = q;
      if (data.from) out = out.gte("created_at", data.from);
      if (data.to) out = out.lte("created_at", data.to);
      return out;
    };

    const [reportsRes, actionsRes, goalsRes] = await Promise.all([
      allStudentIds.length
        ? applyWindow(
            supabaseAdmin.from("pathway_reports").select("student_id, created_at").in("student_id", allStudentIds),
          )
        : Promise.resolve({ data: [] as Array<{ student_id: string | null }> }),
      allStudentIds.length
        ? applyWindow(
            supabaseAdmin
              .from("action_items")
              .select("student_id, status, created_at")
              .in("student_id", allStudentIds),
          )
        : Promise.resolve({ data: [] as Array<{ student_id: string | null; status: string }> }),
      allStudentIds.length
        ? applyWindow(
            supabaseAdmin
              .from("goals")
              .select("student_id, status, created_at")
              .in("student_id", allStudentIds),
          )
        : Promise.resolve({ data: [] as Array<{ student_id: string | null; status: string }> }),
    ]);

    const reportRows = (reportsRes.data ?? []) as Array<{ student_id: string | null }>;
    const actionRows = (actionsRes.data ?? []) as Array<{ student_id: string | null; status: string }>;
    const goalRows = (goalsRes.data ?? []) as Array<{ student_id: string | null; status: string }>;

    const reportsByStudent = new Set(
      reportRows.map((r) => r.student_id).filter((x): x is string => !!x),
    );
    const goalsByStudent = new Set(
      goalRows
        .filter((g) => g.status !== "met" && !!g.student_id)
        .map((g) => g.student_id as string),
    );
    const actionsByStudent = new Map<string, number>();
    for (const a of actionRows) {
      if (!a.student_id || a.status === "complete") continue;
      actionsByStudent.set(a.student_id, (actionsByStudent.get(a.student_id) ?? 0) + 1);
    }

    let studentsTotal = 0;
    let reportsTotal = 0;
    let openActionsTotal = 0;
    let withReportTotal = 0;
    let withGoalsTotal = 0;
    let withActionsTotal = 0;

    const perSchool = schools.map((s) => {
      const ids = studentsByOrg.get(s.id) ?? [];
      const reports = ids.filter((id) => reportsByStudent.has(id)).length;
      const openActs = ids.reduce((n, id) => n + (actionsByStudent.get(id) ?? 0), 0);
      studentsTotal += ids.length;
      reportsTotal += reports;
      openActionsTotal += openActs;
      withReportTotal += reports;
      withGoalsTotal += ids.filter((id) => goalsByStudent.has(id)).length;
      withActionsTotal += ids.filter((id) => (actionsByStudent.get(id) ?? 0) > 0).length;
      return {
        id: s.id,
        name: s.name,
        students_count: ids.length,
        reports_count: reports,
        open_actions: openActs,
      };
    });

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    return {
      from: data.from ?? null,
      to: data.to ?? null,
      metrics: {
        schools_count: schools.length,
        students_count: studentsTotal,
        reports_count: reportsTotal,
        open_actions: openActionsTotal,
        pct_with_report: pct(withReportTotal, studentsTotal),
        pct_with_goals: pct(withGoalsTotal, studentsTotal),
        pct_with_actions: pct(withActionsTotal, studentsTotal),
      },
      schools: perSchool,
    };
  });

